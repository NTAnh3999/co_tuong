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

  it.each(livePositions)('matches $id at depth 4', async ({ id, fen }) => {
    setPosition(engine, { fen });
    // Depth 4 can run well past the UCI helper's 10s default wait -- a timed-out waiter would
    // leave a late response to be misread by the NEXT test's waiter instead of this one's.
    await expect(perft(engine, 4, 170_000)).resolves.toEqual(divide(fromFen(fen), 4));
  }, 180_000);
});
