import { describe, expect, it } from 'vitest';
import { EnginePool, QueueFullError } from './pool.js';
import { EngineProcess } from './uci/engine-process.js';

// A real Node subprocess speaking just enough UCI to drive EnginePool's logic
// end to end (same technique as uci/commands.test.ts's stub engine), with two
// variants selected by a query param on the fake "path": one that answers `go`
// immediately, one that hangs on `go` forever (to force the pool's hard timeout).
function stubEngineScript(opts: { delayMs?: number; hangOnGo?: boolean } = {}): string {
  const { delayMs = 0, hangOnGo = false } = opts;
  return String.raw`
    const readline = require('node:readline');
    readline.createInterface({ input: process.stdin }).on('line', (command) => {
      if (command === 'uci') { console.log('uciok'); }
      else if (command === 'isready') { console.log('readyok'); }
      else if (command.startsWith('setoption')) { /* no ack needed */ }
      else if (command.startsWith('position')) { /* no ack needed */ }
      else if (command.startsWith('go movetime')) {
        if (${hangOnGo}) return; // deliberately never respond
        setTimeout(() => {
          console.log('info depth 1 multipv 1 score cp 50 pv h2e2');
          console.log('bestmove h2e2');
        }, ${delayMs});
      } else if (command === 'quit') { process.exit(0); }
    });
  `;
}

function makeFactory(scripts: string[]): (path: string) => EngineProcess {
  let call = 0;
  return () => {
    const script = scripts[Math.min(call, scripts.length - 1)]!;
    call += 1;
    return new EngineProcess(process.execPath, ['-e', script]);
  };
}

describe('EnginePool', () => {
  it('serves a request once a busy engine frees up', async () => {
    const pool = new EnginePool('unused', 1, 20, makeFactory([stubEngineScript({ delayMs: 150 })]));
    await pool.start();
    try {
      const first = pool.submit({ fen: 'startpos' }, 'hard');
      // The lone engine is now busy; a second request queues behind it.
      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(pool.queueLength).toBe(0); // not queued yet since nothing else submitted
      const second = pool.submit({ fen: 'startpos' }, 'hard');
      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(pool.queueLength).toBe(1);
      await expect(first).resolves.toMatchObject({ move: 'h2e2' });
      await expect(second).resolves.toMatchObject({ move: 'h2e2' });
      expect(pool.queueLength).toBe(0);
    } finally {
      await pool.close();
    }
  }, 10_000);

  it('rejects once the queue is at capacity', async () => {
    const pool = new EnginePool('unused', 1, 1, makeFactory([stubEngineScript({ delayMs: 300 })]));
    await pool.start();
    try {
      const running = pool.submit({ fen: 'startpos' }, 'hard'); // occupies the one engine
      await new Promise((resolve) => setTimeout(resolve, 20));
      const queued = pool.submit({ fen: 'startpos' }, 'hard'); // fills the queue (cap 1)
      await new Promise((resolve) => setTimeout(resolve, 20));
      await expect(pool.submit({ fen: 'startpos' }, 'hard')).rejects.toBeInstanceOf(QueueFullError);
      await running;
      await queued;
    } finally {
      await pool.close();
    }
  }, 10_000);

  it('disposes and respawns an engine that exceeds its hard timeout, and the next request succeeds', async () => {
    const pool = new EnginePool(
      'unused',
      1,
      20,
      makeFactory([stubEngineScript({ hangOnGo: true }), stubEngineScript({ delayMs: 0 })]),
    );
    await pool.start();
    try {
      await expect(pool.submit({ fen: 'startpos' }, 'easy')).rejects.toThrow(/timeout/i);
      expect(pool.stats.totalTimeouts).toBe(1);
      expect(pool.stats.totalRespawns).toBe(1);
      // The slot now holds the SECOND (well-behaved) stub engine from the factory.
      await expect(pool.submit({ fen: 'startpos' }, 'easy')).resolves.toMatchObject({ move: 'h2e2' });
    } finally {
      await pool.close();
    }
  }, 10_000); // easy's movetime (50ms) + hard timeout grace (1500ms) + margin
});
