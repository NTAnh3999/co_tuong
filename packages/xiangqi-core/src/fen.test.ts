import { describe, expect, it } from 'vitest';
import { decodeMove, encodeMove, fromFen, indexToSquare, squareToIndex, toFen, toSquare } from './index.js';
import { createInitialPosition } from './position.js';
import type { Piece, Position } from './types.js';

const START_FEN = 'rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w - - 0 1';

function sparsePosition(): Position {
  const board: (Piece | null)[] = Array.from({ length: 90 }, () => null);
  board[4] = { color: 'red', type: 'GENERAL' };
  board[85] = { color: 'black', type: 'GENERAL' };
  board[31] = { color: 'red', type: 'SOLDIER' };
  board[58] = { color: 'black', type: 'HORSE' };
  return { board, turn: 'black', halfmoveClock: 17, fullmoveNumber: 42 };
}

describe('FEN and move codecs', () => {
  it('CORE-06: emits the exact starting FEN', () => {
    expect(toFen(createInitialPosition())).toBe(START_FEN);
  });

  it('CORE-06: parses the starting FEN into the initial position', () => {
    expect(fromFen(START_FEN)).toEqual(createInitialPosition());
  });

  it('CORE-06: round-trips initial and sparse positions', () => {
    const positions = [createInitialPosition(), sparsePosition(), {
      ...sparsePosition(), turn: 'red' as const, halfmoveClock: 0, fullmoveNumber: 1,
    }];
    for (const position of positions) expect(fromFen(toFen(position))).toEqual(position);
  });

  it('CORE-06: rejects malformed placement, fields, and General layouts', () => {
    expect(() => fromFen('rnbakabnr/8/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w - - 0 1')).toThrow(/9 files/);
    expect(() => fromFen(START_FEN.replace('rnbakabnr', 'xnbakabnr'))).toThrow(/piece letter/);
    expect(() => fromFen('9/9/9/9/9/9/9/9/9/9 w - - 0')).toThrow(/six fields/);
    expect(() => fromFen('9/9/9/9/9/9/9/9/9/9 w - - 0 1')).toThrow(/General/);
    expect(() => fromFen(START_FEN.replace('RNBAKABNR', 'RNBAKKBNR'))).toThrow(/exactly one red General/);
  });

  it('CORE-06: round-trips every board square and rejects invalid squares', () => {
    for (let index = 0; index < 90; index += 1) {
      const square = indexToSquare(index);
      expect(squareToIndex(square)).toBe(index);
    }
    for (const invalid of ['j0', 'a10', '']) expect(() => toSquare(invalid)).toThrow(/Invalid square/);
  });

  it('CORE-06: round-trips UCCI moves including golden start-position moves', () => {
    for (const text of ['a3a4', 'c0e2', 'd0e1', 'h2e2', 'e0e1']) {
      expect(encodeMove(decodeMove(text))).toBe(text);
    }
    expect(encodeMove({ from: toSquare('h2'), to: toSquare('e2') })).toBe('h2e2');
    for (const malformed of ['', 'a3a', 'a3a10', 'j0a1']) expect(() => decodeMove(malformed)).toThrow(/Invalid/);
  });
});
