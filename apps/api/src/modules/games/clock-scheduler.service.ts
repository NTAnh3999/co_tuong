import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { GameSnapshot } from '@xq/shared-contracts';
import { PrismaService } from '../../prisma/prisma.service.js';
import { GamesService } from './games.service.js';

const FIRST_MOVE_LIMIT_MS = 60_000;

@Injectable()
export class ClockScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly timers = new Map<string, NodeJS.Timeout>();

  constructor(private readonly prisma: PrismaService, private readonly games: GamesService) {}

  async onModuleInit(): Promise<void> {
    const activeGames = await this.prisma.game.findMany({ where: { status: 'ACTIVE' }, select: { id: true } });
    for (const { id } of activeGames) {
      try {
        await this.games.checkTimeout(id, Date.now());
        await this.scheduleFromCurrentState(id);
      } catch {
        // The game may have been deleted between the findMany above and this iteration (e.g. a
        // concurrently-running test's cleanup) — skip it rather than aborting the rest of startup.
      }
    }
  }

  onModuleDestroy(): void {
    for (const timer of this.timers.values()) clearTimeout(timer);
    this.timers.clear();
  }

  arm(gameId: string, fireAt: Date): void {
    this.clear(gameId);
    const delay = Math.max(0, fireAt.getTime() - Date.now());
    const timer = setTimeout(() => {
      this.timers.delete(gameId);
      void this.onTimer(gameId);
    }, delay);
    this.timers.set(gameId, timer);
  }

  clear(gameId: string): void {
    const timer = this.timers.get(gameId);
    if (timer !== undefined) clearTimeout(timer);
    this.timers.delete(gameId);
  }

  @OnEvent('game.updated')
  async onGameUpdated(event: { gameId: string; kind: string }): Promise<void> {
    await this.scheduleFromCurrentState(event.gameId);
  }

  private async onTimer(gameId: string): Promise<void> {
    const changed = await this.games.checkTimeout(gameId, Date.now());
    if (changed) {
      this.clear(gameId);
      return;
    }
    // An early timer can race a move update. Re-read persisted state and arm its current deadline.
    await this.scheduleFromCurrentState(gameId);
  }

  private async scheduleFromCurrentState(gameId: string): Promise<void> {
    const snapshot = await this.games.getSnapshot(gameId);
    if (snapshot.status !== 'ACTIVE') {
      this.clear(gameId);
      return;
    }
    const deadline = this.deadline(snapshot);
    if (deadline !== null) this.arm(gameId, new Date(deadline));
    else this.clear(gameId);
  }

  private deadline(snapshot: GameSnapshot): number | null {
    const clock = snapshot.clocks;
    if (clock === null || clock.paused === true) return null;
    if (snapshot.moves.length < 2) return clock.turnStartedAt + FIRST_MOVE_LIMIT_MS + 1;
    const activeRemaining = clock.activeColor === 'red' ? clock.redRemainingMs : clock.blackRemainingMs;
    return clock.turnStartedAt + activeRemaining;
  }
}
