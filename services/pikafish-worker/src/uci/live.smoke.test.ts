import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { initEngine, perft } from './commands.js';
import { EngineProcess } from './engine-process.js';

describe.skipIf(!process.env.PIKAFISH_PATH)('Pikafish live UCI smoke test', () => {
  let engine: EngineProcess;

  beforeAll(async () => {
    engine = new EngineProcess(process.env.PIKAFISH_PATH!);
    await initEngine(engine);
  });

  afterAll(async () => {
    await engine.dispose();
  });

  it('matches the verified start-position depth-4 perft baseline', async () => {
    await expect(perft(engine, 4)).resolves.toMatchObject({ total: 3_290_240 });
  }, 30_000);
});
