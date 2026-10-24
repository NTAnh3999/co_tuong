import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createInitialPosition, encodeMove, getAllLegalMoves, toFen } from '@xq/xiangqi-core';
import { describe, expect, it } from 'vitest';
import { EnginePool } from './pool.js';
import { createWorkerServer } from './server.js';
import { initEngine, searchMultiPv, setPosition } from './uci/commands.js';
import { EngineProcess } from './uci/engine-process.js';

const PIKAFISH_PATH = process.env.PIKAFISH_PATH;
const startPosition = createInitialPosition();
const startFen = toFen(startPosition);
const legalStartMoves = new Set(getAllLegalMoves(startPosition, 'red').map(encodeMove));
const UCI_MOVE = /^[a-i][0-9][a-i][0-9]$/;

async function withLivePool<T>(use: (pool: EnginePool) => Promise<T>): Promise<T> {
  const pool = new EnginePool(PIKAFISH_PATH!, 1);
  await pool.start();
  try {
    return await use(pool);
  } finally {
    await pool.close();
  }
}

async function withLiveServer<T>(pool: EnginePool, use: (baseUrl: string) => Promise<T>): Promise<T> {
  const server: Server = createWorkerServer(pool);
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const { port } = server.address() as AddressInfo;
  try {
    return await use(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }
}

function expectLegalUciMove(move: string): void {
  expect(move).toMatch(UCI_MOVE);
  expect(legalStartMoves.has(move)).toBe(true);
}

describe.skipIf(!PIKAFISH_PATH)('live Pikafish adapter (CORE-06, AI-01)', () => {
  it('round-trips MultiPV output through the real UCI process', async () => {
    const engine = new EngineProcess(PIKAFISH_PATH!);
    try {
      await initEngine(engine);
      setPosition(engine);
      const lines = await searchMultiPv(engine, 100, 3);

      expect(lines).toHaveLength(3);
      for (const line of lines) {
        expect(line.move).toMatch(UCI_MOVE);
        expect(Number.isFinite(line.scoreCp)).toBe(true);
      }
      expect(lines.map((line) => line.multipv)).toEqual([1, 2, 3]);
    } finally {
      await engine.dispose();
    }
  }, 30_000);

  it('returns legal moves through the real engine pool at every difficulty', async () => {
    await withLivePool(async (pool) => {
      for (const difficulty of ['easy', 'medium', 'hard'] as const) {
        const result = await pool.submit({}, difficulty);
        expectLegalUciMove(result.move);
      }
    });
  }, 45_000);

  it('returns a legal move through the real HTTP server and engine pool', async () => {
    await withLivePool(async (pool) => {
      await withLiveServer(pool, async (baseUrl) => {
        const response = await fetch(`${baseUrl}/bestmove`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ fen: startFen, difficulty: 'easy' }),
        });
        expect(response.status).toBe(200);
        const body = await response.json() as { move: string; scoreCp: number };
        expectLegalUciMove(body.move);
        expect(Number.isFinite(body.scoreCp)).toBe(true);
      });
    });
  }, 30_000);
});
