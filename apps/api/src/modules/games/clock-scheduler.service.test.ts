import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { decodeMove } from '@xq/xiangqi-core';
import { testPrisma } from '../../../test/setup/test-db.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ClockScheduler } from './clock-scheduler.service.js';
import { GamesService } from './games.service.js';

const startFen = 'rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w - - 0 1';
const prisma = testPrisma as unknown as PrismaService;
const games = new GamesService(prisma);
const owned: string[] = [];
const start = new Date('2026-01-01T00:00:00.000Z').getTime();

async function createTimedGame(initialMs = 1_000, incrementMs = 0): Promise<string> {
  const { gameId } = await games.createGame(startFen, { initialMs, incrementMs }, null, null);
  owned.push(gameId);
  await games.activateGame(gameId, Date.now());
  return gameId;
}

async function makeFirstTwoMoves(gameId: string): Promise<void> {
  expect((await games.submitMove(gameId, {
    color: 'red', moveId: `red-${gameId}`, expectedVersion: 0, move: decodeMove('b2e2'),
  })).type).toBe('accepted');
  expect((await games.submitMove(gameId, {
    color: 'black', moveId: `black-${gameId}`, expectedVersion: 1, move: decodeMove('b7g7'),
  })).type).toBe('accepted');
}

async function flushIo(): Promise<void> {
  await new Promise<void>((resolve) => setImmediate(resolve));
  await new Promise<void>((resolve) => setImmediate(resolve));
}

// A fired timer's `checkTimeout` runs a REAL Postgres transaction (several real
// network round trips), which can take more than a couple of event-loop ticks to
// settle even though fake timers make the virtual clock jump instantly. Poll with
// real setImmediate ticks (setImmediate is not in `toFake`) until the game's DB
// row leaves ACTIVE, instead of guessing a fixed tick count.
async function waitForTerminal(gameId: string): Promise<void> {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const row = await testPrisma.game.findUniqueOrThrow({ where: { id: gameId } });
    if (row.status !== 'ACTIVE') return;
    await new Promise<void>((resolve) => setImmediate(resolve));
  }
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] });
  vi.setSystemTime(start);
});

afterEach(() => vi.useRealTimers());

afterAll(async () => {
  if (owned.length > 0) {
    await testPrisma.gameMove.deleteMany({ where: { gameId: { in: owned } } });
    await testPrisma.gameSnapshot.deleteMany({ where: { gameId: { in: owned } } });
    await testPrisma.game.deleteMany({ where: { id: { in: owned } } });
  }
  await testPrisma.$disconnect();
});

describe('ClockScheduler transactional timers', () => {
  it('CLOCK-01 finishes an expired clock and persists the timeout winner', async () => {
    const gameId = await createTimedGame(1_000);
    await makeFirstTwoMoves(gameId);
    const scheduler = new ClockScheduler(prisma, games);
    await scheduler.onGameUpdated({ gameId, kind: 'move' });

    await vi.advanceTimersByTimeAsync(1_001);
    await waitForTerminal(gameId);
    const row = await testPrisma.game.findUniqueOrThrow({ where: { id: gameId } });
    expect(row).toMatchObject({ status: 'FINISHED', resultWinner: 'BLACK', resultReason: 'TIMEOUT' });
    scheduler.onModuleDestroy();
  });

  it('CLOCK-01 rearms on a move so the old deadline does nothing', async () => {
    const gameId = await createTimedGame(1_000);
    await makeFirstTwoMoves(gameId);
    const scheduler = new ClockScheduler(prisma, games);
    await scheduler.onGameUpdated({ gameId, kind: 'move' });

    await vi.advanceTimersByTimeAsync(900);
    expect((await games.submitMove(gameId, {
      color: 'red', moveId: `red-third-${gameId}`, expectedVersion: 2, move: decodeMove('e2c2'),
    })).type).toBe('accepted');
    await scheduler.onGameUpdated({ gameId, kind: 'move' });
    await vi.advanceTimersByTimeAsync(100);
    await flushIo();
    expect((await testPrisma.game.findUniqueOrThrow({ where: { id: gameId } })).status).toBe('ACTIVE');

    await vi.advanceTimersByTimeAsync(900);
    await waitForTerminal(gameId);
    expect(await testPrisma.game.findUniqueOrThrow({ where: { id: gameId } })).toMatchObject({
      status: 'FINISHED', resultWinner: 'RED', resultReason: 'TIMEOUT',
    });
    scheduler.onModuleDestroy();
  });

  it('CLOCK-01 aborts games when Red or Black misses their first-move window', async () => {
    const noMoves = await createTimedGame(120_000);
    await games.checkTimeout(noMoves, start + 60_001);
    expect((await testPrisma.game.findUniqueOrThrow({ where: { id: noMoves } })).status).toBe('ABORTED');

    const oneMove = await createTimedGame(120_000);
    expect((await games.submitMove(oneMove, {
      color: 'red', moveId: `red-${oneMove}`, expectedVersion: 0, move: decodeMove('b2e2'),
    })).type).toBe('accepted');
    await games.checkTimeout(oneMove, start + 60_001);
    expect((await testPrisma.game.findUniqueOrThrow({ where: { id: oneMove } })).status).toBe('ABORTED');
  });

  it('CLOCK-01 applies a timeout exactly once', async () => {
    const gameId = await createTimedGame(1_000);
    await makeFirstTwoMoves(gameId);
    expect(await games.checkTimeout(gameId, start + 1_001)).toBe(true);
    expect(await games.checkTimeout(gameId, start + 1_002)).toBe(false);
    expect(await testPrisma.gameMove.count({ where: { gameId } })).toBe(2);
  });

  it('DATA-01 recovers and finishes an expired active game during boot', async () => {
    const gameId = await createTimedGame(1_000);
    await makeFirstTwoMoves(gameId);
    await testPrisma.game.update({
      where: { id: gameId }, data: { turnStartedAt: new Date(start - 2_000) },
    });
    const freshScheduler = new ClockScheduler(prisma, games);
    await freshScheduler.onModuleInit();
    expect(await testPrisma.game.findUniqueOrThrow({ where: { id: gameId } })).toMatchObject({
      status: 'FINISHED', resultWinner: 'BLACK', resultReason: 'TIMEOUT',
    });
    freshScheduler.onModuleDestroy();
  });
});
