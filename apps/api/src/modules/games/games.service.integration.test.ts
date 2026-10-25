import { afterAll, describe, expect, it } from 'vitest';
import { decodeMove, fromFen, applyMove, toFen } from '@xq/xiangqi-core';
import { testPrisma } from '../../../test/setup/test-db.js';
import { GamesService } from './games.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';

const startFen = 'rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w - - 0 1';
const service = new GamesService(testPrisma as unknown as PrismaService);
const owned: string[] = [];
const ownedUsers: string[] = [];

async function game(fen = startFen) {
  const created = await service.createGame(fen, null, null, null);
  owned.push(created.gameId);
  await service.activateGame(created.gameId);
  return created.gameId;
}

// Pause/resume only affect the active color, so these tests need a real on-turn/off-turn
// distinction and a real clock — the untimed `game()` helper above has neither.
async function timedGame(initialMs: number, now: number) {
  const red = await testPrisma.user.create({ data: { nickname: 'ClockRed', type: 'GUEST' } });
  const black = await testPrisma.user.create({ data: { nickname: 'ClockBlack', type: 'GUEST' } });
  ownedUsers.push(red.id, black.id);
  const created = await service.createGame(startFen, { initialMs, incrementMs: 0 }, red.id, black.id);
  owned.push(created.gameId);
  await service.activateGame(created.gameId, now);
  return created.gameId;
}

afterAll(async () => {
  if (owned.length) {
    // Children first — Game's FK relations have no cascade delete configured.
    await testPrisma.gameMove.deleteMany({ where: { gameId: { in: owned } } });
    await testPrisma.gameSnapshot.deleteMany({ where: { gameId: { in: owned } } });
    await testPrisma.game.deleteMany({ where: { id: { in: owned } } });
  }
  if (ownedUsers.length) await testPrisma.user.deleteMany({ where: { id: { in: ownedUsers } } });
  await testPrisma.$disconnect();
});

describe('GamesService transactional persistence', () => {
  it('SYNC-01: serializes concurrent stale-version move submissions', async () => {
    const gameId = await game();
    const outcomes = await Promise.all(Array.from({ length: 20 }, (_, index) => service.submitMove(gameId, {
      color: 'red', moveId: `race-${gameId}-${index}`, expectedVersion: 0, move: decodeMove('e3e4'),
    })));
    expect(outcomes.filter(({ type }) => type === 'accepted')).toHaveLength(1);
    expect(outcomes.filter((outcome) => outcome.type === 'rejected' && outcome.reason === 'VERSION_CONFLICT')).toHaveLength(19);
    expect(await testPrisma.gameMove.count({ where: { gameId } })).toBe(1);
  });

  it('SYNC-02: makes an exact move retry idempotent', async () => {
    const gameId = await game();
    const command = { color: 'red' as const, moveId: `retry-${gameId}`, expectedVersion: 0, move: decodeMove('e3e4') };
    expect((await service.submitMove(gameId, command)).type).toBe('accepted');
    expect((await service.submitMove(gameId, command)).type).toBe('duplicate');
    expect(await testPrisma.gameMove.count({ where: { gameId, moveId: command.moveId } })).toBe(1);
  });

  it('DATA-01: persists a replayable snapshot and reconstructs after service recreation', async () => {
    const gameId = await game();
    // Verified legal move-by-move against the real engine (see .agents/LEDGER.md T3.5 entry) —
    // the original hand-written sequence assumed soldiers/pieces on squares they don't occupy.
    const sequence = [
      ['red', 'b2e2'], ['black', 'b7g7'], ['red', 'e2c2'], ['black', 'f9e8'],
      ['red', 'c2f2'], ['black', 'e8f9'], ['red', 'f2b2'], ['black', 'f9e8'],
      ['red', 'b2e2'], ['black', 'e8f9'],
    ] as const;
    for (const [index, [color, uci]] of sequence.entries()) {
      const out = await service.submitMove(gameId, { color, moveId: `data-${gameId}-${index}`, expectedVersion: index, move: decodeMove(uci) });
      expect(out.type).toBe('accepted');
    }
    const snapshotRow = await testPrisma.gameSnapshot.findFirstOrThrow({ where: { gameId, ply: 10 } });
    let expected = fromFen(startFen);
    for (const [, uci] of sequence) expected = applyMove(expected, decodeMove(uci));
    expect(snapshotRow.fen).toBe(toFen(expected));
    const restarted = new GamesService(testPrisma as unknown as PrismaService);
    const snapshot = await restarted.getSnapshot(gameId);
    expect(snapshot.gameVersion).toBe(10);
    expect(snapshot.moves).toEqual(sequence.map(([, uci]) => uci));
    expect(fromFen(snapshotRow.fen)).toEqual(expected);
  });

  it('writes the checkmate result and finished status', async () => {
    const mateFen = '4k4/9/9/4r4/9/9/9/9/9/3PKP3 b - - 0 1';
    const gameId = await game(mateFen);
    const outcome = await service.submitMove(gameId, {
      color: 'black', moveId: `mate-${gameId}`, expectedVersion: 0, move: decodeMove('e6e2'),
    });
    expect(outcome.type).toBe('accepted');
    const row = await testPrisma.game.findUniqueOrThrow({ where: { id: gameId } });
    expect(row.status).toBe('FINISHED');
    expect(row.resultWinner).toBe('BLACK');
    expect(row.resultReason).toBe('CHECKMATE');
    expect(row.finishedAt).not.toBeNull();
  });
});

describe('GamesService clock pausing on disconnect', () => {
  it('freezes the on-turn color\'s remaining time at the pause instant', async () => {
    const t0 = Date.now();
    const gameId = await timedGame(60_000, t0);
    const paused = await service.pauseClockForDisconnect(gameId, 'red', t0 + 5_000);
    expect(paused?.clocks).toMatchObject({
      paused: true, activeColor: 'red', redRemainingMs: 55_000, blackRemainingMs: 60_000,
    });
  });

  it('ignores a pause request for the color not on turn', async () => {
    const t0 = Date.now();
    const gameId = await timedGame(60_000, t0);
    expect(await service.pauseClockForDisconnect(gameId, 'black', t0 + 5_000)).toBeNull();
    const row = await testPrisma.game.findUniqueOrThrow({ where: { id: gameId } });
    expect(row.clockPausedAt).toBeNull();
  });

  it('is idempotent: pausing an already-paused clock is a no-op', async () => {
    const t0 = Date.now();
    const gameId = await timedGame(60_000, t0);
    await service.pauseClockForDisconnect(gameId, 'red', t0 + 5_000);
    expect(await service.pauseClockForDisconnect(gameId, 'red', t0 + 9_000)).toBeNull();
    const row = await testPrisma.game.findUniqueOrThrow({ where: { id: gameId } });
    expect(row.clockPausedAt?.getTime()).toBe(t0 + 5_000);
  });

  it('resumes by shifting turnStartedAt forward by exactly the paused duration', async () => {
    const t0 = Date.now();
    const gameId = await timedGame(60_000, t0);
    await service.pauseClockForDisconnect(gameId, 'red', t0 + 5_000);
    const resumed = await service.resumeClockForReconnect(gameId, 'red', t0 + 65_000);
    // redRemainingMs is only rebanked by a move, never by pause/resume — turnStartedAt shifts
    // forward by the paused duration instead, so elapsed-time math (server or client) recovers
    // the same 55s remaining without the server double-accounting the banked time.
    expect(resumed?.clocks).toMatchObject({ paused: false, redRemainingMs: 60_000, turnStartedAt: t0 + 60_000 });
    const row = await testPrisma.game.findUniqueOrThrow({ where: { id: gameId } });
    expect(row.clockPausedAt).toBeNull();
    expect(row.turnStartedAt?.getTime()).toBe(t0 + 60_000);
  });

  it('ignores a resume request when the clock is not currently paused', async () => {
    const t0 = Date.now();
    const gameId = await timedGame(60_000, t0);
    expect(await service.resumeClockForReconnect(gameId, 'red', t0 + 1_000)).toBeNull();
  });

  it('keeps checkTimeout from expiring a paused clock no matter how long the disconnect lasts', async () => {
    const t0 = Date.now();
    const gameId = await timedGame(300, t0);
    await service.pauseClockForDisconnect(gameId, 'red', t0 + 100);
    expect(await service.checkTimeout(gameId, t0 + 10_000)).toBe(false);
    const row = await testPrisma.game.findUniqueOrThrow({ where: { id: gameId } });
    expect(row.status).toBe('ACTIVE');
  });

  it('resumes ticking toward timeout after reconnect, excluding the paused window', async () => {
    const t0 = Date.now();
    const gameId = await timedGame(300, t0);
    await service.pauseClockForDisconnect(gameId, 'red', t0 + 100); // 200ms banked
    await service.resumeClockForReconnect(gameId, 'red', t0 + 10_100); // 10s disconnect excluded
    expect(await service.checkTimeout(gameId, t0 + 10_250)).toBe(false); // only 150ms elapsed since resume
    expect(await service.checkTimeout(gameId, t0 + 10_350)).toBe(true); // 250ms elapsed > 200ms banked
    const row = await testPrisma.game.findUniqueOrThrow({ where: { id: gameId } });
    expect(row.status).toBe('FINISHED');
    expect(row.resultReason).toBe('TIMEOUT');
    expect(row.resultWinner).toBe('BLACK');
  });
});
