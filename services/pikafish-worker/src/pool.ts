import { EngineProcess } from './uci/engine-process.js';
import { initEngine, searchMultiPv, setPosition } from './uci/commands.js';
import { DIFFICULTY_PROFILES, selectMove, type Difficulty } from './difficulty.js';
import type { MultiPvLine } from './uci/commands.js';

export class QueueFullError extends Error {}
export class EngineTimeoutError extends Error {}
export interface PoolStats { totalRequests: number; totalTimeouts: number; totalErrors: number; totalRespawns: number }
export type EngineFactory = (path: string) => EngineProcess;

export class EnginePool {
  private readonly slots: Array<{ engine: EngineProcess; busy: boolean }> = [];
  private readonly queue: Array<{ fen?: string; moves?: string[]; difficulty: Difficulty; resolve: (line: MultiPvLine) => void; reject: (error: Error) => void }> = [];
  readonly stats: PoolStats = { totalRequests: 0, totalTimeouts: 0, totalErrors: 0, totalRespawns: 0 };
  constructor(private readonly path: string, readonly poolSize = 2, readonly queueCap = 20, private readonly factory: EngineFactory = (p) => new EngineProcess(p)) {}

  async start(): Promise<void> {
    const initialized: Array<{ engine: EngineProcess; busy: boolean }> = [];
    try { for (let i = 0; i < this.poolSize; i++) { const engine = this.factory(this.path); await initEngine(engine); initialized.push({ engine, busy: false }); } }
    catch (error) { await Promise.all(initialized.map(({ engine }) => engine.dispose())); throw error; }
    this.slots.push(...initialized);
  }
  get idleEngines(): number { return this.slots.filter((slot) => !slot.busy).length; }
  get queueLength(): number { return this.queue.length; }
  submit(position: { fen?: string; moves?: string[] }, difficulty: Difficulty): Promise<MultiPvLine> {
    this.stats.totalRequests++;
    return new Promise((resolve, reject) => {
      const job = { ...position, difficulty, resolve, reject };
      const slot = this.slots.find((item) => !item.busy);
      if (slot) { void this.run(slot, job); return; }
      if (this.queue.length >= this.queueCap) { this.stats.totalErrors++; reject(new QueueFullError('Engine request queue is full')); return; }
      this.queue.push(job);
    });
  }
  async close(): Promise<void> { await Promise.all(this.slots.map(({ engine }) => engine.dispose())); }
  private async run(slot: { engine: EngineProcess; busy: boolean }, job: { fen?: string; moves?: string[]; difficulty: Difficulty; resolve: (line: MultiPvLine) => void; reject: (error: Error) => void }): Promise<void> {
    slot.busy = true;
    const profile = DIFFICULTY_PROFILES[job.difficulty];
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const search = (async () => { setPosition(slot.engine, { fen: job.fen, moves: job.moves }); const lines = await searchMultiPv(slot.engine, profile.movetimeMs, profile.multiPv); return selectMove(lines, job.difficulty); })();
      // If the hard timeout below wins the race, `search` keeps running against
      // an engine we're about to dispose(); dispose() immediately rejects its
      // pending waitFor, so `search` WILL still reject shortly after losing —
      // with nothing left awaiting it, that would otherwise surface as an
      // unhandled promise rejection (which crashes a long-running Node process
      // by default). Swallow a late rejection from the losing side explicitly.
      search.catch(() => {});
      const result = await Promise.race([
        search,
        new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new EngineTimeoutError('Engine search exceeded its hard timeout')), profile.movetimeMs + 1500); }),
      ]);
      job.resolve(result);
    } catch (error) {
      this.stats.totalErrors++;
      if (error instanceof EngineTimeoutError) {
        this.stats.totalTimeouts++;
        await slot.engine.dispose();
        try {
          slot.engine = this.factory(this.path);
          await initEngine(slot.engine);
          this.stats.totalRespawns++;
        } catch (respawnError) {
          // The replacement engine failed to come up (e.g. the binary is now
          // unreachable). Dispose it rather than leaving a half-initialized
          // process dangling off this slot for a future request to pick up.
          await slot.engine.dispose().catch(() => {});
          job.reject(respawnError instanceof Error ? respawnError : new Error(String(respawnError)));
          return;
        }
      }
      job.reject(error instanceof Error ? error : new Error(String(error)));
    } finally {
      if (timer) clearTimeout(timer);
      slot.busy = false;
      const next = this.queue.shift();
      if (next) void this.run(slot, next);
    }
  }
}
