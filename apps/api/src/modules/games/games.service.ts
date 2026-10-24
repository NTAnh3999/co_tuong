import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { applyMove, CASUAL_RULESET, decodeMove, encodeMove, fromFen, toFen } from '@xq/xiangqi-core';
import type { Color, Move } from '@xq/xiangqi-core';
import type { ClockState, GameSnapshot, TimeControl } from '@xq/shared-contracts';
import { createGameAggregate, submitMove } from './domain/game-aggregate.js';
import type { GameAggregateState, SubmitMoveCommand, SubmitMoveOutcome } from './domain/game-aggregate.js';
import { PrismaService } from '../../prisma/prisma.service.js';

type DbClient = PrismaService | Prisma.TransactionClient;

@Injectable()
export class GamesService {
  constructor(private readonly prisma: PrismaService) {}

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
  }

  async submitMove(gameId: string, command: SubmitMoveCommand): Promise<SubmitMoveOutcome> {
    try {
      return await this.prisma.$transaction(async (tx) => {
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
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return { type: 'rejected', reason: 'VERSION_CONFLICT' };
      }
      throw error;
    }
  }

  async getSnapshot(gameId: string): Promise<GameSnapshot> {
    const [game, state] = await Promise.all([
      this.prisma.game.findUniqueOrThrow({ where: { id: gameId } }),
      this.reconstruct(this.prisma, gameId),
    ]);
    return {
      gameId, status: state.status, initialFen: state.initialFen,
      moves: state.moves.map(encodeMove), gameVersion: state.gameVersion, clocks: state.clock,
      result: state.result,
      redPlayerId: game.redId, blackPlayerId: game.blackId, serverNow: Date.now(),
    };
  }

  private async playerId(tx: DbClient, gameId: string, color: Color): Promise<string | null> {
    const game = await tx.game.findUniqueOrThrow({ where: { id: gameId }, select: { redId: true, blackId: true } });
    return color === 'red' ? game.redId : game.blackId;
  }

  private async reconstruct(tx: DbClient, gameId: string): Promise<GameAggregateState> {
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
    };
  }
}
