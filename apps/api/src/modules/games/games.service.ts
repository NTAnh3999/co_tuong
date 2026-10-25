import { ConflictException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma } from '@prisma/client';
import { applyMove, CASUAL_RULESET, decodeMove, encodeMove, evaluateGame, fromFen, toFen } from '@xq/xiangqi-core';
import type { Color, Move } from '@xq/xiangqi-core';
import type { ClockState, GameSnapshot, TimeControl } from '@xq/shared-contracts';
import { createGameAggregate, submitMove } from './domain/game-aggregate.js';
import type { GameAggregateState, SubmitMoveCommand, SubmitMoveOutcome } from './domain/game-aggregate.js';
import { isClockExpired, isFirstMoveTimedOut, remainingMsAt } from './domain/clock.js';
import { PrismaService } from '../../prisma/prisma.service.js';

type DbClient = PrismaService | Prisma.TransactionClient;

@Injectable()
export class GamesService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly eventEmitter?: EventEmitter2,
  ) {}

  async createGame(initialFen: string, timeControl: TimeControl | null, redId: string | null, blackId: string | null): Promise<{ gameId: string }> {
    const now = Date.now();
    const aggregate = createGameAggregate(initialFen, timeControl, now);
    const game = await this.prisma.game.create({
      data: {
        mode: 'ONLINE', redId, blackId, initialFen, ruleSetVersion: CASUAL_RULESET.version, status: aggregate.status,
        ...(aggregate.clock === null ? {} : {
          initialMs: timeControl!.initialMs, incrementMs: timeControl!.incrementMs,
          redRemainingMs: aggregate.clock.redRemainingMs, blackRemainingMs: aggregate.clock.blackRemainingMs,
          activeColor: 'RED', turnStartedAt: new Date(aggregate.clock.turnStartedAt),
        }),
      },
    });
    return { gameId: game.id };
  }

  async activateGame(gameId: string, now = Date.now()): Promise<void> {
    const game = await this.prisma.game.findUniqueOrThrow({ where: { id: gameId } });
    await this.prisma.game.update({
      where: { id: gameId },
      data: { status: 'ACTIVE', ...(game.initialMs === null ? {} : { activeColor: 'RED', turnStartedAt: new Date(now) }) },
    });
    this.eventEmitter?.emit('game.updated', { gameId, kind: 'activated' });
  }

  async checkTimeout(gameId: string, now: number): Promise<boolean> {
    const changed = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw(Prisma.sql`SELECT id FROM "Game" WHERE id = ${gameId} FOR UPDATE`);
      const state = await this.reconstruct(tx, gameId);
      if (state.status !== 'ACTIVE') return false;
      // While the active color's clock is paused (they're disconnected), clamp "now" to the
      // pause instant so a long disconnect never times them out — the clock is frozen, not
      // running down toward a timeout they have no way to respond to.
      const effectiveNow = state.clockPausedAt ?? now;

      if (state.clock !== null && state.moves.length < 2 && isFirstMoveTimedOut(state.clock.turnStartedAt, effectiveNow)) {
        await tx.game.update({ where: { id: gameId }, data: {
          status: 'ABORTED', gameVersion: state.gameVersion + 1,
          resultWinner: null, resultReason: 'ABORTED', finishedAt: new Date(now),
        } });
        return true;
      }

      const loser = state.clock === null ? null : isClockExpired(state.clock, effectiveNow);
      if (loser === null) return false;
      const result = evaluateGame({
        initialFen: state.initialFen, moves: state.moves, ruleSetVersion: CASUAL_RULESET.version,
        terminalEvent: { type: 'TIMEOUT', loser },
      }, CASUAL_RULESET);
      if (result === null) return false;
      await tx.game.update({ where: { id: gameId }, data: {
        status: 'FINISHED', gameVersion: state.gameVersion + 1,
        resultWinner: result.winner === null ? null : result.winner === 'red' ? 'RED' : 'BLACK',
        resultReason: result.reason, finishedAt: new Date(now), drawOfferBy: null, drawOfferPly: null,
      } });
      return true;
    });
    if (changed) this.eventEmitter?.emit('game.updated', { gameId, kind: 'timeout' });
    return changed;
  }

  async submitMove(gameId: string, command: SubmitMoveCommand): Promise<SubmitMoveOutcome> {
    try {
      const outcome = await this.prisma.$transaction(async (tx) => {
        await tx.$queryRaw(Prisma.sql`SELECT id FROM "Game" WHERE id = ${gameId} FOR UPDATE`);
        const state = await this.reconstruct(tx, gameId);
        const outcome = submitMove(state, command, Date.now());
        if (outcome.type !== 'accepted') return outcome;
        const next = outcome.state;
        const moverId = command.color === 'red' ? await this.playerId(tx, gameId, 'red') : await this.playerId(tx, gameId, 'black');
        const moverClockMs = command.color === 'red' ? next.clock?.redRemainingMs : next.clock?.blackRemainingMs;
        await tx.gameMove.create({ data: {
          gameId, ply: next.moves.length - 1, uci: encodeMove(command.move), moveId: command.moveId,
          playerId: moverId, clockAfterMs: moverClockMs ?? null,
        } });
        await tx.game.update({
          where: { id: gameId },
          data: {
            gameVersion: next.gameVersion, status: next.status,
            ...(next.clock === null ? {} : {
              redRemainingMs: next.clock.redRemainingMs, blackRemainingMs: next.clock.blackRemainingMs,
              activeColor: next.clock.activeColor === 'red' ? 'RED' : 'BLACK',
              turnStartedAt: new Date(next.clock.turnStartedAt),
            }),
            ...(next.result === null ? {} : {
              resultWinner: next.result.winner === null ? null : next.result.winner === 'red' ? 'RED' : 'BLACK',
              resultReason: next.result.reason, finishedAt: new Date(),
            }),
          },
        });
        const ply = next.moves.length;
        if (ply % 10 === 0 || next.result !== null) {
          await tx.gameSnapshot.create({ data: {
            gameId, ply, fen: toFen(next.position),
            clocksJson: next.clock === null ? Prisma.JsonNull : next.clock,
            version: next.gameVersion,
          } });
        }
        return outcome;
      });
      if (outcome.type === 'accepted') {
        this.eventEmitter?.emit('game.updated', {
          gameId, kind: 'move', moveId: command.moveId, move: command.move,
        });
      }
      return outcome;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return { type: 'rejected', reason: 'VERSION_CONFLICT' };
      }
      throw error;
    }
  }

  async getSnapshot(gameId: string): Promise<GameSnapshot> {
    const game = await this.prisma.game.findUnique({ where: { id: gameId } });
    if (!game) throw new NotFoundException('GAME_NOT_FOUND');
    const state = await this.reconstruct(this.prisma, gameId);
    return {
      gameId, status: state.status, initialFen: state.initialFen,
      moves: state.moves.map(encodeMove), gameVersion: state.gameVersion,
      clocks: this.liveClockView(state.clock, state.clockPausedAt),
      result: state.result,
      redPlayerId: game.redId, blackPlayerId: game.blackId,
      drawOfferBy: game.drawOfferBy === null ? null : game.drawOfferBy === 'RED' ? 'red' : 'black',
      serverNow: Date.now(),
    };
  }

  /**
   * Pauses the active color's clock when they disconnect: freezes the remaining time as of the
   * disconnect instant so a long disconnect never burns their clock. No-op (returns null) unless
   * the game is active, has a clock, isn't already paused, and `color` is the one on turn.
   */
  async pauseClockForDisconnect(gameId: string, color: Color, now = Date.now()): Promise<GameSnapshot | null> {
    const changed = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw(Prisma.sql`SELECT id FROM "Game" WHERE id = ${gameId} FOR UPDATE`);
      const game = await tx.game.findUniqueOrThrow({ where: { id: gameId } });
      if (game.status !== 'ACTIVE' || game.clockPausedAt !== null || game.turnStartedAt === null) return false;
      if ((game.activeColor === 'RED' ? 'red' : 'black') !== color) return false;
      await tx.game.update({ where: { id: gameId }, data: { clockPausedAt: new Date(now) } });
      return true;
    });
    return changed ? this.getSnapshot(gameId) : null;
  }

  /**
   * Resumes a paused clock when the color on turn reconnects: shifts turnStartedAt forward by
   * exactly the paused duration so the disconnect window is excluded from elapsed time. No-op
   * (returns null) unless the game is active, currently paused, and `color` is the one on turn.
   */
  async resumeClockForReconnect(gameId: string, color: Color, now = Date.now()): Promise<GameSnapshot | null> {
    const changed = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw(Prisma.sql`SELECT id FROM "Game" WHERE id = ${gameId} FOR UPDATE`);
      const game = await tx.game.findUniqueOrThrow({ where: { id: gameId } });
      if (game.status !== 'ACTIVE' || game.clockPausedAt === null || game.turnStartedAt === null) return false;
      if ((game.activeColor === 'RED' ? 'red' : 'black') !== color) return false;
      const pausedForMs = now - game.clockPausedAt.getTime();
      await tx.game.update({ where: { id: gameId }, data: {
        clockPausedAt: null, turnStartedAt: new Date(game.turnStartedAt.getTime() + pausedForMs),
      } });
      return true;
    });
    return changed ? this.getSnapshot(gameId) : null;
  }

  /** The clock as clients should see it right now: frozen at the pause instant while paused. */
  private liveClockView(clock: ClockState | null, pausedAt: number | null): ClockState | null {
    if (clock === null) return null;
    if (pausedAt === null) return { ...clock, paused: false };
    const frozen = remainingMsAt(clock, pausedAt);
    return {
      redRemainingMs: frozen.red, blackRemainingMs: frozen.black,
      activeColor: clock.activeColor, turnStartedAt: clock.turnStartedAt,
      paused: true,
    };
  }

  async getPlayers(gameId: string): Promise<{ redId: string | null; blackId: string | null }> {
    const game = await this.prisma.game.findUnique({ where: { id: gameId }, select: { redId: true, blackId: true } });
    if (!game) throw new NotFoundException('GAME_NOT_FOUND');
    return game;
  }

  async getMoves(gameId: string, cursor: number, limit: number) {
    const game = await this.prisma.game.findUnique({ where: { id: gameId }, select: { id: true } });
    if (!game) throw new NotFoundException('GAME_NOT_FOUND');
    const rows = await this.prisma.gameMove.findMany({
      where: { gameId, ply: { gt: cursor } }, orderBy: { ply: 'asc' }, take: limit + 1,
      select: { ply: true, uci: true, clockAfterMs: true },
    });
    const hasMore = rows.length > limit;
    const moves = rows.slice(0, limit);
    return {
      moves,
      nextCursor: hasMore ? String(moves.at(-1)!.ply) : null,
    };
  }

  async listForUser(userId: string) {
    const games = await this.prisma.game.findMany({
      where: { OR: [{ redId: userId }, { blackId: userId }] },
      orderBy: { createdAt: 'desc' }, take: 100,
      select: {
        id: true, redId: true, blackId: true, status: true, resultWinner: true, resultReason: true,
        red: { select: { id: true, nickname: true } }, black: { select: { id: true, nickname: true } },
      },
    });
    return { games: games.map((game) => ({
      gameId: game.id,
      opponent: game.redId === userId ? game.black : game.red,
      status: game.status,
      result: game.resultReason === null ? null : {
        winner: game.resultWinner === null ? null : game.resultWinner === 'RED' ? 'red' : 'black',
        reason: game.resultReason,
      },
    })) };
  }

  async resign(gameId: string, color: Color): Promise<GameSnapshot> {
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw(Prisma.sql`SELECT id FROM "Game" WHERE id = ${gameId} FOR UPDATE`);
      const state = await this.reconstruct(tx, gameId);
      if (state.status !== 'ACTIVE') throw new ConflictException('GAME_NOT_ACTIVE');
      const result = evaluateGame({
        initialFen: state.initialFen, moves: state.moves, ruleSetVersion: CASUAL_RULESET.version,
        terminalEvent: { type: 'RESIGNATION', loser: color },
      }, CASUAL_RULESET);
      if (result === null) throw new ConflictException('GAME_NOT_ACTIVE');
      await tx.game.update({ where: { id: gameId }, data: {
        status: 'FINISHED', gameVersion: state.gameVersion + 1,
        resultWinner: result.winner === null ? null : result.winner === 'red' ? 'RED' : 'BLACK',
        resultReason: result.reason, finishedAt: new Date(), drawOfferBy: null, drawOfferPly: null,
      } });
    });
    const snapshot = await this.getSnapshot(gameId);
    this.eventEmitter?.emit('game.updated', { gameId, kind: 'resign' });
    return snapshot;
  }

  async drawOffer(gameId: string, color: Color, action: 'offer' | 'accept' | 'decline'): Promise<GameSnapshot> {
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw(Prisma.sql`SELECT id FROM "Game" WHERE id = ${gameId} FOR UPDATE`);
      const game = await tx.game.findUnique({ where: { id: gameId }, select: { drawOfferBy: true } });
      if (!game) throw new NotFoundException('GAME_NOT_FOUND');
      const state = await this.reconstruct(tx, gameId);
      if (state.status !== 'ACTIVE') throw new ConflictException('GAME_NOT_ACTIVE');
      if (action === 'offer') {
        if (game.drawOfferBy !== null) throw new ConflictException('DRAW_OFFER_PENDING');
        await tx.game.update({ where: { id: gameId }, data: { drawOfferBy: color === 'red' ? 'RED' : 'BLACK', drawOfferPly: state.moves.length } });
        return;
      }
      if (game.drawOfferBy === null) throw new ConflictException('NO_DRAW_OFFER');
      const offerer = game.drawOfferBy === 'RED' ? 'red' : 'black';
      if (offerer === color) throw new ConflictException('DRAW_OFFERER_CANNOT_RESPOND');
      if (action === 'decline') {
        await tx.game.update({ where: { id: gameId }, data: { drawOfferBy: null, drawOfferPly: null } });
        return;
      }
      const result = evaluateGame({
        initialFen: state.initialFen, moves: state.moves, ruleSetVersion: CASUAL_RULESET.version,
        terminalEvent: { type: 'DRAW_AGREEMENT' },
      }, CASUAL_RULESET);
      if (result === null) throw new ConflictException('GAME_NOT_ACTIVE');
      await tx.game.update({ where: { id: gameId }, data: {
        status: 'FINISHED', gameVersion: state.gameVersion + 1, resultWinner: null,
        resultReason: result.reason, finishedAt: new Date(), drawOfferBy: null, drawOfferPly: null,
      } });
    });
    const snapshot = await this.getSnapshot(gameId);
    this.eventEmitter?.emit('game.updated', { gameId, kind: 'draw' });
    return snapshot;
  }

  async abandon(gameId: string, loser: Color): Promise<GameSnapshot> {
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw(Prisma.sql`SELECT id FROM "Game" WHERE id = ${gameId} FOR UPDATE`);
      const state = await this.reconstruct(tx, gameId);
      if (state.status !== 'ACTIVE') throw new ConflictException('GAME_NOT_ACTIVE');
      const result = evaluateGame({
        initialFen: state.initialFen, moves: state.moves, ruleSetVersion: CASUAL_RULESET.version,
        terminalEvent: { type: 'ABANDONMENT', loser },
      }, CASUAL_RULESET);
      if (result === null) throw new ConflictException('GAME_NOT_ACTIVE');
      await tx.game.update({ where: { id: gameId }, data: {
        status: 'FINISHED', gameVersion: state.gameVersion + 1,
        resultWinner: result.winner === null ? null : result.winner === 'red' ? 'RED' : 'BLACK',
        resultReason: result.reason, finishedAt: new Date(), drawOfferBy: null, drawOfferPly: null,
      } });
    });
    const snapshot = await this.getSnapshot(gameId);
    this.eventEmitter?.emit('game.updated', { gameId, kind: 'abandonment' });
    return snapshot;
  }

  private async playerId(tx: DbClient, gameId: string, color: Color): Promise<string | null> {
    const game = await tx.game.findUniqueOrThrow({ where: { id: gameId }, select: { redId: true, blackId: true } });
    return color === 'red' ? game.redId : game.blackId;
  }

  private async reconstruct(tx: DbClient, gameId: string): Promise<GameAggregateState & { clockPausedAt: number | null }> {
    const game = await tx.game.findUniqueOrThrow({ where: { id: gameId }, include: { moves: { orderBy: { ply: 'asc' } } } });
    const moves: Move[] = game.moves.map(({ uci }) => decodeMove(uci));
    const position = moves.reduce((current, move) => applyMove(current, move), fromFen(game.initialFen));
    const timeControl: TimeControl | null = game.initialMs === null || game.incrementMs === null
      ? null : { initialMs: game.initialMs, incrementMs: game.incrementMs };
    const clock: ClockState | null = timeControl === null || game.redRemainingMs === null || game.blackRemainingMs === null || game.activeColor === null || game.turnStartedAt === null
      ? null : {
        redRemainingMs: game.redRemainingMs, blackRemainingMs: game.blackRemainingMs,
        activeColor: game.activeColor === 'RED' ? 'red' : 'black', turnStartedAt: game.turnStartedAt.getTime(),
      };
    return {
      status: game.status, initialFen: game.initialFen, position, moves,
      moveIds: game.moves.map(({ moveId }) => moveId), gameVersion: game.gameVersion, timeControl, clock,
      result: game.resultReason === null ? null : {
        winner: game.resultWinner === null ? null : game.resultWinner === 'RED' ? 'red' : 'black',
        reason: game.resultReason as NonNullable<GameAggregateState['result']>['reason'],
      },
      clockPausedAt: game.clockPausedAt === null ? null : game.clockPausedAt.getTime(),
    };
  }
}
