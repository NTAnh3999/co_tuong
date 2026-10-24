import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  applyMove, createInitialPosition, decodeMove, divide, getAllLegalMoves,
  getLegalMoves, getPseudoLegalMoves, isInCheck, isLegalMove, toSquare,
} from './index.js';
import type { Color, PieceType, Position } from './types.js';

function position(...placements: readonly (readonly [string, Color, PieceType])[]): Position {
  const board = Array.from({ length: 90 }, () => null as Position['board'][number]);
  for (const [square, color, type] of placements) {
    const file = square.charCodeAt(0) - 97;
    const rank = Number(square[1]);
    board[rank * 9 + file] = { color, type };
  }
  return { board, turn: 'red', halfmoveClock: 7, fullmoveNumber: 12 };
}

function freezePosition(pos: Position): Position {
  for (const piece of pos.board) if (piece !== null) Object.freeze(piece);
  Object.freeze(pos.board);
  return Object.freeze(pos);
}

describe('CORE-03: General safety and legal moves', () => {
  it('CORE-03: excludes a pseudo-legal move that exposes the General to a Chariot', () => {
    const pos = position(['e0', 'red', 'GENERAL'], ['a9', 'black', 'GENERAL'], ['e4', 'red', 'CHARIOT'], ['e9', 'black', 'CHARIOT']);
    expect(getPseudoLegalMoves(pos, toSquare('e4')).some((move) => move.to === toSquare('d4'))).toBe(true);
    expect(getLegalMoves(pos, toSquare('e4')).some((move) => move.to === toSquare('d4'))).toBe(false);
  });

  it('CORE-03: only allows moves that resolve an existing check', () => {
    const pos = position(['e0', 'red', 'GENERAL'], ['a9', 'black', 'GENERAL'], ['e9', 'black', 'CHARIOT'], ['a3', 'red', 'SOLDIER']);
    expect(isInCheck(pos, 'red')).toBe(true);
    expect(getAllLegalMoves(pos, 'red').length).toBeGreaterThan(0);
    expect(getAllLegalMoves(pos, 'red').every((move) => !isInCheck(applyMove(pos, move), 'red'))).toBe(true);
    expect(getAllLegalMoves(pos, 'red').some((move) => move.from === toSquare('a3'))).toBe(false);
  });

  it('CORE-03: treats facing Generals as check for both sides and forbids moving the screen away', () => {
    const pos = position(['e0', 'red', 'GENERAL'], ['e9', 'black', 'GENERAL'], ['e4', 'red', 'CHARIOT']);
    expect(getLegalMoves(pos, toSquare('e4')).some((move) => move.to === toSquare('d4'))).toBe(false);
    const facing = position(['e0', 'red', 'GENERAL'], ['e9', 'black', 'GENERAL']);
    expect(isInCheck(facing, 'red')).toBe(true);
    expect(isInCheck(facing, 'black')).toBe(true);
  });

  it('CORE-03: returns no legal moves for a checked General with every escape blocked', () => {
    const pos = position(
      ['e0', 'red', 'GENERAL'], ['a9', 'black', 'GENERAL'], ['e2', 'black', 'CHARIOT'],
      ['d0', 'red', 'SOLDIER'], ['f0', 'red', 'SOLDIER'],
    );
    expect(isInCheck(pos, 'red')).toBe(true);
    expect(getAllLegalMoves(pos, 'red')).toEqual([]);
  });

  it('CORE-03: rejects malformed positions without exactly one General per color', () => {
    expect(() => isInCheck(position(['e0', 'red', 'GENERAL']), 'red')).toThrow(/missing black General/);
    expect(() => isInCheck(position(['e0', 'red', 'GENERAL'], ['d0', 'red', 'GENERAL'], ['e9', 'black', 'GENERAL']), 'red')).toThrow(/multiple red Generals/);
  });

  it('CORE-03: isLegalMove requires the moving piece to belong to the side to move', () => {
    const pos = position(['e0', 'red', 'GENERAL'], ['a9', 'black', 'GENERAL'], ['a3', 'red', 'SOLDIER']);
    expect(isLegalMove(pos, decodeMove('a3a4'))).toBe(true);
    expect(isLegalMove({ ...pos, turn: 'black' }, decodeMove('a3a4'))).toBe(false);
  });
});

describe('CORE-03: applyMove', () => {
  it('CORE-03: applies a move to a new position without mutating a deeply frozen input', () => {
    const pos = freezePosition(position(['e0', 'red', 'GENERAL'], ['e9', 'black', 'GENERAL'], ['a3', 'red', 'SOLDIER']));
    const before = structuredClone(pos);
    const result = applyMove(pos, decodeMove('a3a4'));
    expect(result).not.toBe(pos);
    expect(result.board).not.toBe(pos.board);
    expect(pos).toEqual(before);
    expect(result.board[4 * 9]).toEqual({ color: 'red', type: 'SOLDIER' });
    expect(result.board[3 * 9]).toBeNull();
  });

  it('CORE-03: updates clocks and turn correctly for non-captures, captures, and Black moves', () => {
    const redStart = position(['e0', 'red', 'GENERAL'], ['e9', 'black', 'GENERAL'], ['a3', 'red', 'SOLDIER']);
    const redResult = applyMove(redStart, decodeMove('a3a4'));
    expect(redResult.halfmoveClock).toBe(8);
    expect(redResult.turn).toBe('black');
    expect(redResult.fullmoveNumber).toBe(12);

    const blackStart = { ...redStart, turn: 'black' as const, board: redStart.board.slice() };
    (blackStart.board as (Position['board'][number])[])[8 * 9] = { color: 'red', type: 'SOLDIER' };
    const blackResult = applyMove(blackStart, decodeMove('e9e8'));
    expect(blackResult.turn).toBe('red');
    expect(blackResult.fullmoveNumber).toBe(13);

    const captureStart = position(['e0', 'red', 'GENERAL'], ['e9', 'black', 'GENERAL'], ['a3', 'red', 'CHARIOT'], ['a5', 'black', 'SOLDIER']);
    expect(applyMove(captureStart, decodeMove('a3a5')).halfmoveClock).toBe(0);
    expect(() => applyMove(captureStart, decodeMove('b3b4'))).toThrow(/no piece at b3/);
  });
});

describe('CORE-03: perft and divide', () => {
  it('CORE-03: exactly matches Pikafish golden start-position divides at depths 1 through 3', () => {
    const fixture = JSON.parse(readFileSync(new URL('../fixtures/golden/startpos.json', import.meta.url), 'utf8')) as {
      positions: { perft: Record<string, { moves: Record<string, number>; total: number }> }[];
    };
    const expected = fixture.positions[0]?.perft;
    expect(expected).toBeDefined();
    for (const depth of [1, 2, 3]) {
      expect(divide(createInitialPosition(), depth)).toEqual(expected?.[String(depth)]);
    }
  });

  it('CORE-03: defines depth zero as one leaf and depth one as the legal move count', () => {
    const pos = createInitialPosition();
    expect(divide(pos, 0)).toEqual({ moves: {}, total: 1 });
    expect(divide(pos, 1).total).toBe(getAllLegalMoves(pos, 'red').length);
  });
});
