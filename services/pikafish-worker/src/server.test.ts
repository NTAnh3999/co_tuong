import { describe, expect, it, vi } from 'vitest';
import type { AddressInfo } from 'node:net';
import { createWorkerServer } from './server.js';
import { QueueFullError, EngineTimeoutError, type EnginePool } from './pool.js';
import type { MultiPvLine } from './uci/commands.js';

function fakePool(overrides: Partial<EnginePool> = {}): EnginePool {
  return {
    poolSize: 2,
    idleEngines: 1,
    queueLength: 0,
    stats: { totalRequests: 1, totalTimeouts: 0, totalErrors: 0, totalRespawns: 0 },
    submit: vi.fn(async (): Promise<MultiPvLine> => ({ multipv: 1, move: 'h2e2', scoreCp: 42 })),
    ...overrides,
  } as unknown as EnginePool;
}

async function withServer(pool: EnginePool, use: (baseUrl: string) => Promise<void>): Promise<void> {
  const server = createWorkerServer(pool);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const { port } = server.address() as AddressInfo;
  try {
    await use(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

describe('createWorkerServer', () => {
  it('GET /health reports pool stats', async () => {
    const pool = fakePool({ poolSize: 2, idleEngines: 2, queueLength: 0 });
    await withServer(pool, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/health`);
      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({ status: 'ok', poolSize: 2, idleEngines: 2, queueLength: 0 });
    });
  });

  it('GET /metrics reports counters', async () => {
    const pool = fakePool({ stats: { totalRequests: 5, totalTimeouts: 1, totalErrors: 1, totalRespawns: 1 } });
    await withServer(pool, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/metrics`);
      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toMatchObject({ totalRequests: 5, totalTimeouts: 1, totalErrors: 1, totalRespawns: 1 });
    });
  });

  it('POST /bestmove returns the pool\'s chosen move', async () => {
    const pool = fakePool();
    await withServer(pool, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/bestmove`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ fen: 'startpos', difficulty: 'hard' }),
      });
      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({ move: 'h2e2', scoreCp: 42 });
      expect(pool.submit).toHaveBeenCalledWith({ fen: 'startpos', difficulty: 'hard' }, 'hard');
    });
  });

  it('POST /bestmove rejects a malformed body with 400', async () => {
    const pool = fakePool();
    await withServer(pool, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/bestmove`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ difficulty: 'impossible' }),
      });
      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toMatchObject({ error: { code: 'INVALID_REQUEST' } });
    });
  });

  it('POST /bestmove rejects invalid JSON with 400', async () => {
    const pool = fakePool();
    await withServer(pool, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/bestmove`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{not json',
      });
      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toMatchObject({ error: { code: 'INVALID_REQUEST' } });
    });
  });

  it('POST /bestmove maps a QueueFullError to 503', async () => {
    const pool = fakePool({ submit: vi.fn(async () => { throw new QueueFullError('full'); }) });
    await withServer(pool, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/bestmove`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ difficulty: 'easy' }),
      });
      expect(response.status).toBe(503);
      await expect(response.json()).resolves.toMatchObject({ error: { code: 'QUEUE_FULL' } });
    });
  });

  it('POST /bestmove maps an EngineTimeoutError to 504', async () => {
    const pool = fakePool({ submit: vi.fn(async () => { throw new EngineTimeoutError('too slow'); }) });
    await withServer(pool, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/bestmove`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ difficulty: 'easy' }),
      });
      expect(response.status).toBe(504);
      await expect(response.json()).resolves.toMatchObject({ error: { code: 'ENGINE_TIMEOUT' } });
    });
  });

  it('POST /bestmove maps any other error to 500', async () => {
    const pool = fakePool({ submit: vi.fn(async () => { throw new Error('boom'); }) });
    await withServer(pool, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/bestmove`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ difficulty: 'easy' }),
      });
      expect(response.status).toBe(500);
      await expect(response.json()).resolves.toMatchObject({ error: { code: 'ENGINE_ERROR' } });
    });
  });

  it('an unknown route returns 404', async () => {
    const pool = fakePool();
    await withServer(pool, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/nope`);
      expect(response.status).toBe(404);
    });
  });
});
