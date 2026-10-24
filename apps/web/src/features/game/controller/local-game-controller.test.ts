import { describe, expect, it } from 'vitest';
import {
  applyMove,
  createInitialPosition,
  getAllLegalMoves,
  getLegalMoves,
  toSquare,
} from '@xq/xiangqi-core';
import type { Move } from '@xq/xiangqi-core';
import { createLocalGameController } from './local-game-controller.js';

const sq = toSquare;

describe('LOCAL-01: LocalGameController', () => {
  it('starts at the standard position with a red orientation and no game state', () => {
    const controller = createLocalGameController();
    const state = controller.getState();
    expect(state.position).toEqual(createInitialPosition());
    expect(state.history).toEqual([]);
    expect(state.lastMove).toBeNull();
    expect(state.selectedSquare).toBeNull();
    expect(state.legalTargets).toEqual([]);
    expect(state.orientation).toBe('red');
    expect(state.result).toBeNull();
  });

  it('selects a current-side piece and exposes its legal destinations', () => {
    const controller = createLocalGameController();
    controller.selectSquare(sq('a0'));
    expect(controller.getState().selectedSquare).toBe(sq('a0'));
    expect(controller.getState().legalTargets).toEqual(getLegalMoves(controller.getState().position, sq('a0')).map((move) => move.to));
  });

  it('does not change state when selecting an empty or enemy square with no selection', () => {
    const controller = createLocalGameController();
    const before = controller.getState();
    controller.selectSquare(sq('e4'));
    expect(controller.getState()).toBe(before);
    controller.selectSquare(sq('a9'));
    expect(controller.getState()).toBe(before);
  });

  it('applies a tap-to-tap move and clears the selection', () => {
    const controller = createLocalGameController();
    const move = getLegalMoves(controller.getState().position, sq('a0'))[0];
    expect(move).toBeDefined();
    if (move === undefined) return;
    controller.selectSquare(move.from);
    controller.selectSquare(move.to);
    const state = controller.getState();
    expect(state.history).toEqual([move]);
    expect(state.lastMove).toEqual(move);
    expect(state.position).toEqual(applyMove(createInitialPosition(), move));
    expect(state.selectedSquare).toBeNull();
    expect(state.legalTargets).toEqual([]);
  });

  it('switches selection when a different current-side piece is tapped', () => {
    const controller = createLocalGameController();
    controller.selectSquare(sq('a0'));
    controller.selectSquare(sq('b0'));
    expect(controller.getState().selectedSquare).toBe(sq('b0'));
    expect(controller.getState().legalTargets).toEqual(getLegalMoves(controller.getState().position, sq('b0')).map((move) => move.to));
    expect(controller.getState().history).toEqual([]);
  });

  it('accepts legal direct moves and rejects illegal ones without changing state', () => {
    const controller = createLocalGameController();
    const move = getLegalMoves(controller.getState().position, sq('a0'))[0];
    expect(move).toBeDefined();
    if (move === undefined) return;
    expect(controller.submitMove(move)).toBe(true);
    const afterLegal = controller.getState();
    expect(afterLegal.history).toEqual([move]);
    expect(afterLegal.position).toEqual(applyMove(createInitialPosition(), move));

    const illegal: Move = { from: sq('a0'), to: sq('b0') };
    expect(controller.submitMove(illegal)).toBe(false);
    expect(controller.getState()).toBe(afterLegal);
  });

  it('ends on checkmate and rejects all later move input', () => {
    const controller = createLocalGameController('4k4/9/9/9/4P4/9/5r3/9/9/R2PKP3 w - - 0 1');
    expect(controller.submitMove({ from: sq('a0'), to: sq('a1') })).toBe(true);
    expect(controller.getState().position.turn).toBe('black');
    expect(getLegalMoves(controller.getState().position, sq('f2'))).toContainEqual({ from: sq('f2'), to: sq('e2') });
    expect(controller.submitMove({ from: sq('f2'), to: sq('e2') })).toBe(true);
    expect(controller.getState().result).toEqual({ winner: 'black', reason: 'CHECKMATE' });
    const terminalState = controller.getState();
    expect(controller.submitMove({ from: sq('e9'), to: sq('d9') })).toBe(false);
    controller.selectSquare(sq('a1'));
    expect(controller.getState()).toBe(terminalState);
  });

  it('flips orientation between red and black', () => {
    const controller = createLocalGameController();
    controller.flip();
    expect(controller.getState().orientation).toBe('black');
    controller.flip();
    expect(controller.getState().orientation).toBe('red');
  });

  it('records resignation for the specified loser', () => {
    const controller = createLocalGameController();
    controller.resign?.('red');
    expect(controller.getState().result).toEqual({ winner: 'black', reason: 'RESIGNATION' });
  });

  it('ends with an agreed draw when draw is offered locally', () => {
    const controller = createLocalGameController();
    controller.offerDraw?.();
    expect(controller.getState().result).toEqual({ winner: null, reason: 'DRAW_AGREEMENT' });
  });

  it('undoes a move by replaying from the start and is a no-op with empty history', () => {
    const controller = createLocalGameController();
    const before = controller.getState();
    controller.undo?.();
    expect(controller.getState()).toBe(before);
    const first = getLegalMoves(controller.getState().position, sq('a0'))[0];
    expect(first).toBeDefined();
    if (first === undefined) return;
    controller.submitMove(first);
    const beforeLast = controller.getState();
    const blackMove = getAllLegalMoves(beforeLast.position, 'black')[0];
    expect(blackMove).toBeDefined();
    if (blackMove === undefined) return;
    controller.submitMove(blackMove);
    controller.undo?.();
    expect(controller.getState().position).toEqual(beforeLast.position);
    expect(controller.getState().history).toEqual(beforeLast.history);
    expect(controller.getState().lastMove).toEqual(beforeLast.lastMove);
  });

  it('undo after resignation or draw clears the terminal event and restores ongoing play', () => {
    for (const endGame of [(controller: ReturnType<typeof createLocalGameController>) => controller.resign?.('red'),
      (controller: ReturnType<typeof createLocalGameController>) => controller.offerDraw?.()]) {
      const controller = createLocalGameController();
      const move = getLegalMoves(controller.getState().position, sq('a0'))[0];
      expect(move).toBeDefined();
      if (move === undefined) continue;
      controller.submitMove(move);
      endGame(controller);
      expect(controller.getState().result).not.toBeNull();
      controller.undo?.();
      expect(controller.getState().history).toEqual([]);
      expect(controller.getState().position).toEqual(createInitialPosition());
      expect(controller.getState().result).toBeNull();
    }
  });

  it('notifies subscribers after state changes but not after no-ops', () => {
    const controller = createLocalGameController();
    let calls = 0;
    const unsubscribe = controller.subscribe(() => { calls += 1; });
    controller.selectSquare(sq('e4'));
    expect(calls).toBe(0);
    controller.selectSquare(sq('a0'));
    expect(calls).toBe(1);
    expect(controller.submitMove({ from: sq('a0'), to: sq('b0') })).toBe(false);
    expect(calls).toBe(1);
    controller.flip();
    expect(calls).toBe(2);
    unsubscribe();
  });
});
