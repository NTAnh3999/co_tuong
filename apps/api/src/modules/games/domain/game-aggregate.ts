import {
  CASUAL_RULESET,
  applyMove,
  evaluateGame,
  fromFen,
  isLegalMove,
} from '@xq/xiangqi-core';
import type { Color, GameResult, Move, Position } from '@xq/xiangqi-core';
import type { ClockState, RejectReason, TimeControl } from '@xq/shared-contracts';
import { applyMoveToClock, createClockState, isClockExpired, isFirstMoveTimedOut } from './clock.js';

export interface GameAggregateState {
  readonly status: 'WAITING' | 'ACTIVE' | 'FINISHED' | 'ABORTED';
  readonly initialFen: string;
  readonly position: Position;
  readonly moves: readonly Move[];
  readonly moveIds: readonly string[];
  readonly gameVersion: number;
  readonly timeControl: TimeControl | null;
  readonly clock: ClockState | null;
  readonly result: GameResult | null;
}

export interface SubmitMoveCommand {
  readonly color: Color;
  readonly moveId: string;
  readonly expectedVersion: number;
  readonly move: Move;
}

export type SubmitMoveOutcome =
  | { readonly type: 'accepted'; readonly state: GameAggregateState }
  | { readonly type: 'duplicate'; readonly state: GameAggregateState }
  | { readonly type: 'rejected'; readonly reason: RejectReason };

function rejected(reason: RejectReason): SubmitMoveOutcome {
  return { type: 'rejected', reason };
}

export function createGameAggregate(
  initialFen: string,
  timeControl: TimeControl | null,
  now: number,
): GameAggregateState {
  return {
    status: 'WAITING',
    initialFen,
    position: fromFen(initialFen),
    moves: [],
    moveIds: [],
    gameVersion: 0,
    timeControl,
    clock: timeControl === null ? null : createClockState(timeControl, now),
    result: null,
  };
}

export function submitMove(
  state: GameAggregateState,
  command: SubmitMoveCommand,
  now: number,
): SubmitMoveOutcome {
  if (state.moveIds.at(-1) === command.moveId) return { type: 'duplicate', state };
  if (state.status !== 'ACTIVE') return rejected('GAME_NOT_ACTIVE');
  if (command.expectedVersion !== state.gameVersion) return rejected('VERSION_CONFLICT');
  if (command.color !== state.position.turn) return rejected('NOT_YOUR_TURN');
  if (!isLegalMove(state.position, command.move)) return rejected('ILLEGAL_MOVE');

  const isMoverFirstMoveOfGame = state.moves.length < 2;
  if (state.clock !== null && state.timeControl !== null) {
    if (isMoverFirstMoveOfGame) {
      if (isFirstMoveTimedOut(state.clock.turnStartedAt, now)) return rejected('TIME_EXPIRED');
    } else if (isClockExpired(state.clock, now) === command.color) {
      return rejected('TIME_EXPIRED');
    }
  }

  const position = applyMove(state.position, command.move);
  const moves = [...state.moves, command.move];
  const moveIds = [...state.moveIds, command.moveId];
  const clock = state.clock === null || state.timeControl === null
    ? null
    : applyMoveToClock(state.clock, state.timeControl, now, isMoverFirstMoveOfGame);
  const gameVersion = state.gameVersion + 1;
  const result = evaluateGame({
    initialFen: state.initialFen,
    moves,
    ruleSetVersion: CASUAL_RULESET.version,
  }, CASUAL_RULESET);

  return {
    type: 'accepted',
    state: {
      status: result === null ? 'ACTIVE' : 'FINISHED',
      initialFen: state.initialFen,
      position,
      moves,
      moveIds,
      gameVersion,
      timeControl: state.timeControl,
      clock,
      result,
    },
  };
}
