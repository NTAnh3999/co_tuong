import { describe, expect, it } from 'vitest';
import { applyMove, decodeMove, fromFen, getLegalMoves, toSquare } from '@xq/xiangqi-core';
import type { TimeControl } from '@xq/shared-contracts';
import { createGameAggregate, submitMove } from './game-aggregate.js';
import type { GameAggregateState, SubmitMoveCommand } from './game-aggregate.js';

const initialFen = 'rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w - - 0 1';
const timed: TimeControl = { initialMs: 300_000, incrementMs: 5_000 };

function active(state: GameAggregateState): GameAggregateState {
  return { ...state, status: 'ACTIVE' };
}

function command(color: 'red' | 'black', moveId: string, expectedVersion: number, text: string): SubmitMoveCommand {
  return { color, moveId, expectedVersion, move: decodeMove(text) };
}

function accepted(state: GameAggregateState, input: SubmitMoveCommand, now: number): GameAggregateState {
  const outcome = submitMove(state, input, now);
  expect(outcome.type).toBe('accepted');
  if (outcome.type !== 'accepted') throw new Error(`Expected accepted move, got ${JSON.stringify(outcome)}`);
  return outcome.state;
}

describe('SYNC-02: pure game aggregate move processing', () => {
  it('SYNC-02: increments versions and keeps position, moves, and move IDs in sync', () => {
    const created = createGameAggregate(initialFen, null, 1000);
    let state = active(created);
    const moves = [
      command('red', 'red-1', 0, 'e3e4'),
      command('black', 'black-1', 1, 'e6e5'),
      command('red', 'red-2', 2, 'e4e5'),
    ];

    for (const [index, move] of moves.entries()) {
      state = accepted(state, move, 2000 + index);
      expect(state.gameVersion).toBe(index + 1);
      expect(state.moves).toHaveLength(index + 1);
      expect(state.moveIds).toHaveLength(index + 1);
    }
    expect(state.moves).toEqual(moves.map(({ move }) => move));
    expect(state.moveIds).toEqual(['red-1', 'black-1', 'red-2']);
    const expectedPosition = state.moves.reduce((position, move) => applyMove(position, move), fromFen(initialFen));
    expect(state.position).toEqual(expectedPosition);
    expect(state.clock).toBeNull();
  });

  it('SYNC-02: rejects a stale expected version', () => {
    const start = active(createGameAggregate(initialFen, null, 0));
    const afterMove = accepted(start, command('red', 'm1', 0, 'e3e4'), 1);
    expect(submitMove(afterMove, command('black', 'm2', 0, 'e6e5'), 2))
      .toEqual({ type: 'rejected', reason: 'VERSION_CONFLICT' });
  });

  it('SYNC-02: rejects the wrong claimed color before checking move legality', () => {
    const state = active(createGameAggregate(initialFen, null, 0));
    expect(submitMove(state, command('black', 'm1', 0, 'e3e4'), 1))
      .toEqual({ type: 'rejected', reason: 'NOT_YOUR_TURN' });
  });

  it('SYNC-02: rejects a move absent from the current position’s legal move list', () => {
    const state = active(createGameAggregate(initialFen, null, 0));
    const illegal = decodeMove('a0a0');
    expect(getLegalMoves(state.position, toSquare('a0'))).not.toContainEqual(illegal);
    expect(submitMove(state, { color: 'red', moveId: 'm1', expectedVersion: 0, move: illegal }, 1))
      .toEqual({ type: 'rejected', reason: 'ILLEGAL_MOVE' });
  });

  it.each(['WAITING', 'FINISHED', 'ABORTED'] as const)('SYNC-02: rejects moves while status is %s', (status) => {
    const state = { ...createGameAggregate(initialFen, null, 0), status };
    expect(submitMove(state, command('red', 'm1', 0, 'e3e4'), 1))
      .toEqual({ type: 'rejected', reason: 'GAME_NOT_ACTIVE' });
  });

  it('SYNC-02: returns the unchanged state for an exact retry of the most recent accepted move', () => {
    const start = active(createGameAggregate(initialFen, null, 0));
    const retry = command('red', 'same-id', 0, 'e3e4');
    const afterMove = accepted(start, retry, 1);
    expect(submitMove(afterMove, retry, 999_999)).toEqual({ type: 'duplicate', state: afterMove });
  });

  it('SYNC-02: rejects a non-first move after the active side’s remaining time expires', () => {
    const start = active(createGameAggregate(initialFen, { initialMs: 1000, incrementMs: 0 }, 0));
    const afterRedFirst = accepted(start, command('red', 'r1', 0, 'e3e4'), 60_000);
    const afterBlackFirst = accepted(afterRedFirst, command('black', 'b1', 1, 'e6e5'), 120_000);
    expect(submitMove(afterBlackFirst, command('red', 'r2', 2, 'e4e5'), 121_001))
      .toEqual({ type: 'rejected', reason: 'TIME_EXPIRED' });
  });

  it('SYNC-02: rejects a first move after 61 simulated seconds', () => {
    const state = active(createGameAggregate(initialFen, timed, 10_000));
    expect(submitMove(state, command('red', 'r1', 0, 'e3e4'), 71_001))
      .toEqual({ type: 'rejected', reason: 'TIME_EXPIRED' });
  });

  it('SYNC-02: finishes the aggregate with the correct winner after a checkmating move', () => {
    const mateInOneFen = '4k4/9/9/4r4/9/9/9/9/9/3PKP3 b - - 0 1';
    const state = active(createGameAggregate(mateInOneFen, null, 0));
    const outcome = submitMove(state, command('black', 'mate', 0, 'e6e2'), 1);
    expect(outcome.type).toBe('accepted');
    if (outcome.type !== 'accepted') return;
    expect(outcome.state.status).toBe('FINISHED');
    expect(outcome.state.result).toEqual({ winner: 'black', reason: 'CHECKMATE' });
  });

  it('SYNC-02: accepts untimed moves regardless of elapsed time and keeps clock null', () => {
    let state = active(createGameAggregate(initialFen, null, 0));
    state = accepted(state, command('red', 'r1', 0, 'e3e4'), 61_000_000);
    expect(state.clock).toBeNull();
    state = accepted(state, command('black', 'b1', 1, 'e6e5'), 9_000_000_000);
    expect(state.clock).toBeNull();
  });
});
