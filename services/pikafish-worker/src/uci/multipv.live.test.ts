import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { initEngine, searchMultiPv, setPosition } from './commands.js';
import { EngineProcess } from './engine-process.js';

describe.skipIf(!process.env.PIKAFISH_PATH)('Pikafish live MultiPV', () => {
  let engine: EngineProcess;
  beforeAll(async () => { engine = new EngineProcess(process.env.PIKAFISH_PATH!); await initEngine(engine); });
  afterAll(async () => { await engine.dispose(); });
  it('returns three distinct legal moves with descending scores', async () => {
    setPosition(engine);
    const lines = await searchMultiPv(engine, 200, 3);
    expect(lines).toHaveLength(3);
    expect(new Set(lines.map((line) => line.move)).size).toBe(3);
    expect(lines[0]!.scoreCp).toBeGreaterThanOrEqual(lines[1]!.scoreCp);
    expect(lines[1]!.scoreCp).toBeGreaterThanOrEqual(lines[2]!.scoreCp);
  }, 15_000);
});
