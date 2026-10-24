import { CASUAL_RULESET, decodeMove, replay } from '@xq/xiangqi-core';
import type { GameResult, Move, Position } from '@xq/xiangqi-core';
import type { GameSnapshot } from '@xq/shared-contracts';

export interface ReplayStep {
  readonly position: Position;
  readonly lastMove: Move | null;
}

export interface ReplayControllerState {
  readonly steps: readonly ReplayStep[];
  readonly currentPly: number;
  readonly result: GameResult | null;
}

export interface ReplayController {
  getState(): ReplayControllerState;
  subscribe(listener: () => void): () => void;
  goToPly(ply: number): void;
  next(): void;
  previous(): void;
}

export function createReplayController(game: GameSnapshot): ReplayController {
  const replaySteps = replay({
    initialFen: game.initialFen,
    moves: game.moves.map(decodeMove),
    ruleSetVersion: CASUAL_RULESET.version,
  });
  const steps: readonly ReplayStep[] = replaySteps.map(({ position, move }) => ({ position, lastMove: move }));
  const listeners = new Set<() => void>();
  let state: ReplayControllerState = { steps, currentPly: 0, result: game.result };

  const goToPly = (ply: number): void => {
    const currentPly = Math.max(0, Math.min(steps.length - 1, Math.trunc(ply)));
    if (currentPly === state.currentPly) return;
    state = { ...state, currentPly };
    listeners.forEach((listener) => listener());
  };

  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    goToPly,
    next: () => goToPly(state.currentPly + 1),
    previous: () => goToPly(state.currentPly - 1),
  };
}
