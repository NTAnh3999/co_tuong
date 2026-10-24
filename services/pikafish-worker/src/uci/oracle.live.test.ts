import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { divide, fromFen } from '../../../../packages/xiangqi-core/src/index.js';
import { curatedPositions } from '../../../../packages/xiangqi-core/fixtures/curated-positions.js';
import { EngineProcess, initEngine, perft, setPosition } from './index.js';

const livePositions = curatedPositions.slice(0, 7);

describe.skipIf(!process.env.PIKAFISH_PATH)('Pikafish live oracle cross-check', () => {
  let engine: EngineProcess;

  beforeAll(async () => {
    engine = new EngineProcess(process.env.PIKAFISH_PATH!);
    await initEngine(engine);
  });

  afterAll(async () => {
    await engine.dispose();
  });

  it.each(livePositions)('matches $id at depth 2', async ({ id, fen }) => {
    setPosition(engine, { fen });
    await expect(perft(engine, 2)).resolves.toEqual(divide(fromFen(fen), 2));
  }, 30_000);
});
