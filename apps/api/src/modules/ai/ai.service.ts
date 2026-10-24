import { randomUUID } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  applyMove,
  decodeMove,
  encodeMove,
  fromFen,
  getAllLegalMoves,
  squareToIndex,
} from '@xq/xiangqi-core';
import type { Color, Move, Position } from '@xq/xiangqi-core';
import { PrismaService } from '../../prisma/prisma.service.js';
import { GamesService } from '../games/games.service.js';

export type AiDifficulty = 'easy' | 'medium' | 'hard';
export type HumanColor = 'red' | 'black';

const STARTING_FEN = 'rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w - - 0 1';
const WORKER_TIMEOUT_MS = 10_000;

type GameUpdatedEvent = { gameId: string };

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly gamesInFlight = new Map<string, Promise<void>>();

  constructor(private readonly prisma: PrismaService, private readonly games: GamesService) {}

  async createAiGame(humanId: string, humanColor: HumanColor, difficulty: AiDifficulty): Promise<{ gameId: string }> {
    const redId = humanColor === 'red' ? humanId : null;
    const blackId = humanColor === 'black' ? humanId : null;
    const { gameId } = await this.games.createGame(STARTING_FEN, null, redId, blackId);

    // GamesService owns game creation; AI-specific metadata stays private to this module.
    await this.prisma.game.update({
      where: { id: gameId },
      data: { mode: 'AI', aiDifficulty: difficulty.toUpperCase() as 'EASY' | 'MEDIUM' | 'HARD' },
    });
    await this.games.activateGame(gameId);

    if (humanColor === 'black') await this.playEngineTurn(gameId);
    return { gameId };
  }

  @OnEvent('game.updated')
  async onGameUpdated(event: GameUpdatedEvent): Promise<void> {
    await this.playEngineTurn(event.gameId);
  }

  private playEngineTurn(gameId: string): Promise<void> {
    const inFlight = this.gamesInFlight.get(gameId);
    if (inFlight !== undefined) return inFlight;
    const processing = this.processEngineTurn(gameId);
    this.gamesInFlight.set(gameId, processing);
    void processing.finally(() => this.gamesInFlight.delete(gameId));
    return processing;
  }

  private async processEngineTurn(gameId: string): Promise<void> {
    try {
      const [snapshot, game] = await Promise.all([
        this.games.getSnapshot(gameId),
        this.findAiGame(gameId),
      ]);
      if (game === null || game.aiDifficulty === null || snapshot.status !== 'ACTIVE') return;

      const engineColor: Color | null = game.redId === null ? 'red' : game.blackId === null ? 'black' : null;
      if (engineColor === null) return;
      const sideToMove: Color = snapshot.moves.length % 2 === 0 ? 'red' : 'black';
      if (sideToMove !== engineColor) return;

      const position = snapshot.moves.reduce((current, uci) => applyMove(current, decodeMove(uci)), fromFen(snapshot.initialFen));
      const difficulty = game.aiDifficulty.toLowerCase() as AiDifficulty;
      let workerMove: Move | null = null;
      try {
        const uci = await this.requestEngineMove(snapshot.initialFen, snapshot.moves, difficulty);
        workerMove = decodeMove(uci);
      } catch (error) {
        this.logger.warn(`Pikafish request failed for game ${gameId}; choosing a legal fallback move`, error instanceof Error ? error.message : String(error));
      }

      if (workerMove !== null) {
        const outcome = await this.submitEngineMove(gameId, engineColor, snapshot.gameVersion, workerMove);
        if (outcome.type === 'accepted' || outcome.type === 'duplicate') return;
        if (outcome.reason !== 'ILLEGAL_MOVE') {
          this.logger.warn(`Engine move rejected for game ${gameId}: ${outcome.reason}`);
          return;
        }
        this.logger.warn(`Worker returned an illegal move for game ${gameId}; choosing a legal fallback move`);
      }

      const fallback = this.fallbackMove(position);
      const fallbackOutcome = await this.submitEngineMove(gameId, engineColor, snapshot.gameVersion, fallback);
      if (fallbackOutcome.type !== 'accepted' && fallbackOutcome.type !== 'duplicate') {
        this.logger.warn(`Fallback engine move rejected for game ${gameId}: ${fallbackOutcome.reason}`);
      }
    } catch (error) {
      this.logger.error(`Could not process engine turn for game ${gameId}`, error instanceof Error ? error.stack : String(error));
    }
  }

  private findAiGame(gameId: string) {
    return this.prisma.game.findUnique({
      where: { id: gameId },
      select: { redId: true, blackId: true, aiDifficulty: true },
    });
  }

  private requestEngineMove(fen: string, moves: string[], difficulty: AiDifficulty): Promise<string> {
    return this.fetchEngineMove(fen, moves, difficulty);
  }

  private async fetchEngineMove(fen: string, moves: string[], difficulty: AiDifficulty): Promise<string> {
    const baseUrl = process.env.PIKAFISH_WORKER_URL ?? 'http://localhost:4000';
    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/bestmove`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ fen, moves, difficulty }),
      signal: AbortSignal.timeout(WORKER_TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`Pikafish worker returned HTTP ${response.status}`);
    const payload: unknown = await response.json();
    if (typeof payload !== 'object' || payload === null || !('move' in payload) || typeof payload.move !== 'string'
      || !/^[a-i][0-9][a-i][0-9]$/.test(payload.move)
      || !('scoreCp' in payload) || typeof payload.scoreCp !== 'number') {
      throw new Error('Pikafish worker returned a malformed response');
    }
    return payload.move;
  }

  private fallbackMove(position: Position): Move {
    const legal = getAllLegalMoves(position, position.turn);
    const captures = legal.filter((move) => position.board[squareToIndex(move.to)] !== null);
    const pool = captures.length > 0 ? captures : legal;
    const choice = pool[Math.floor(Math.random() * pool.length)];
    if (choice === undefined) throw new Error('No legal engine moves in an active game');
    return choice;
  }

  private submitEngineMove(gameId: string, color: Color, expectedVersion: number, move: Move) {
    return this.games.submitMove(gameId, {
      color,
      moveId: randomUUID(),
      expectedVersion,
      move: decodeMove(encodeMove(move)),
    });
  }
}
