import { describe, expect, it } from 'vitest';
import { getAllPseudoLegalMoves, getPseudoLegalMoves, isSquareAttacked, toSquare } from './index.js';
import type { Color, PieceType, Position, Square } from './types.js';

function position(...placements: readonly (readonly [string, Color, PieceType])[]): Position {
  const board = Array.from({ length: 90 }, () => null as Position['board'][number]);
  for (const [square, color, type] of placements) {
    const file = square.charCodeAt(0) - 97;
    const rank = Number(square[1]);
    board[rank * 9 + file] = { color, type };
  }
  return { board, turn: 'black', halfmoveClock: 0, fullmoveNumber: 1 };
}

function destinations(pos: Position, from: string): string[] {
  return getPseudoLegalMoves(pos, toSquare(from)).map((move) => move.to).sort();
}

describe('CORE-02: GENERAL pseudo-legal moves', () => {
  it('CORE-02: GENERAL moves one orthogonal step within its palace', () => {
    expect(destinations(position(['e1', 'red', 'GENERAL']), 'e1')).toEqual(['d1', 'e0', 'e2', 'f1']);
  });
  it('CORE-02: GENERAL stays inside the palace edge', () => {
    expect(destinations(position(['d0', 'red', 'GENERAL']), 'd0')).toEqual(['d1', 'e0']);
  });
  it('CORE-02: GENERAL cannot move onto a friendly piece', () => {
    expect(destinations(position(['e1', 'red', 'GENERAL'], ['e2', 'red', 'SOLDIER']), 'e1')).not.toContain('e2');
  });
});

describe('CORE-02: ADVISOR pseudo-legal moves', () => {
  it('CORE-02: ADVISOR moves diagonally inside its palace', () => {
    expect(destinations(position(['e1', 'red', 'ADVISOR']), 'e1')).toEqual(['d0', 'd2', 'f0', 'f2']);
  });
  it('CORE-02: ADVISOR cannot step outside the palace corner', () => {
    expect(destinations(position(['d0', 'red', 'ADVISOR']), 'd0')).toEqual(['e1']);
  });
  it('CORE-02: ADVISOR cannot move onto a friendly piece', () => {
    expect(destinations(position(['e1', 'red', 'ADVISOR'], ['d2', 'red', 'SOLDIER']), 'e1')).not.toContain('d2');
  });
});

describe('CORE-02: ELEPHANT pseudo-legal moves', () => {
  it('CORE-02: ELEPHANT moves two points diagonally', () => {
    expect(destinations(position(['e2', 'red', 'ELEPHANT']), 'e2')).toEqual(['c0', 'c4', 'g0', 'g4']);
  });
  it('CORE-02: ELEPHANT cannot cross the river', () => {
    expect(destinations(position(['e4', 'red', 'ELEPHANT']), 'e4')).toEqual(['c2', 'g2']);
  });
  it('CORE-02: ELEPHANT eye blocker prevents that diagonal', () => {
    expect(destinations(position(['e2', 'red', 'ELEPHANT'], ['f3', 'black', 'SOLDIER']), 'e2')).not.toContain('g4');
  });
});

describe('CORE-02: HORSE pseudo-legal moves', () => {
  it('CORE-02: HORSE has unobstructed L moves', () => {
    expect(destinations(position(['e4', 'red', 'HORSE']), 'e4')).toHaveLength(8);
  });
  it('CORE-02: HORSE destinations respect board edges', () => {
    expect(destinations(position(['a0', 'red', 'HORSE']), 'a0')).toEqual(['b2', 'c1']);
  });
  it('CORE-02: HORSE leg blocker removes its associated moves', () => {
    expect(destinations(position(['e4', 'red', 'HORSE'], ['e5', 'black', 'SOLDIER']), 'e4')).not.toContain('f6');
  });
});

describe('CORE-02: CHARIOT pseudo-legal moves', () => {
  it('CORE-02: CHARIOT slides along open ranks and files', () => {
    expect(destinations(position(['e4', 'red', 'CHARIOT']), 'e4')).toHaveLength(17);
  });
  it('CORE-02: CHARIOT is bounded by the board edge', () => {
    expect(destinations(position(['a0', 'red', 'CHARIOT']), 'a0')).toHaveLength(17);
  });
  it('CORE-02: CHARIOT captures the first enemy and stops before a friendly piece', () => {
    const pos = position(['e4', 'red', 'CHARIOT'], ['e6', 'black', 'SOLDIER'], ['e7', 'black', 'SOLDIER'], ['d4', 'red', 'SOLDIER']);
    const moves = destinations(pos, 'e4');
    expect(moves).toContain('e6');
    expect(moves).not.toContain('e7');
    expect(moves).not.toContain('d4');
  });
});

describe('CORE-02: CANNON pseudo-legal moves', () => {
  it('CORE-02: CANNON slides only within board edges', () => {
    expect(destinations(position(['a0', 'red', 'CANNON']), 'a0')).toHaveLength(17);
  });
  it('CORE-02: CANNON slides through empty squares without capturing the first piece', () => {
    const moves = destinations(position(['e4', 'red', 'CANNON'], ['e6', 'black', 'SOLDIER']), 'e4');
    expect(moves).toContain('e5');
    expect(moves).not.toContain('e6');
  });
  it('CORE-02: CANNON captures the first enemy beyond exactly one screen', () => {
    expect(destinations(position(['e4', 'red', 'CANNON'], ['e5', 'red', 'SOLDIER'], ['e7', 'black', 'SOLDIER']), 'e4')).toContain('e7');
  });
  it('CORE-02: CANNON with zero screens cannot capture', () => {
    expect(destinations(position(['e4', 'red', 'CANNON'], ['e5', 'black', 'SOLDIER']), 'e4')).not.toContain('e5');
  });
  it('CORE-02: CANNON cannot capture beyond a second screen', () => {
    expect(destinations(position(['e4', 'red', 'CANNON'], ['e5', 'red', 'SOLDIER'], ['e6', 'red', 'SOLDIER'], ['e7', 'black', 'SOLDIER']), 'e4')).not.toContain('e7');
  });
});

describe('CORE-02: SOLDIER pseudo-legal moves', () => {
  it('CORE-02: SOLDIER advances forward before crossing the river', () => {
    expect(destinations(position(['e3', 'red', 'SOLDIER']), 'e3')).toEqual(['e4']);
  });
  it('CORE-02: SOLDIER gains sideways moves after crossing the river', () => {
    expect(destinations(position(['e5', 'red', 'SOLDIER']), 'e5')).toEqual(['d5', 'e6', 'f5']);
  });
  it('CORE-02: SOLDIER at the far rank has no forward move and cannot move backward', () => {
    expect(destinations(position(['e9', 'red', 'SOLDIER']), 'e9')).toEqual(['d9', 'f9']);
  });
});

describe('CORE-02: all pseudo-legal moves and square attacks', () => {
  it('CORE-02: empty squares have no moves and all moves use the piece color, not turn', () => {
    const pos = position(['e3', 'red', 'SOLDIER']);
    expect(getPseudoLegalMoves(pos, toSquare('a0'))).toEqual([]);
    expect(getAllPseudoLegalMoves(pos, 'red').map((move) => move.to)).toEqual([toSquare('e4')]);
    expect(getAllPseudoLegalMoves(pos, 'black')).toEqual([]);
  });
  it('CORE-02: CHARIOT attacks down an open file', () => {
    expect(isSquareAttacked(position(['e0', 'red', 'CHARIOT']), toSquare('e9'), 'red')).toBe(true);
  });
  it('CORE-02: CANNON attacks through one screen but not an empty sliding square', () => {
    const pos = position(['e0', 'red', 'CANNON'], ['e2', 'red', 'SOLDIER'], ['e5', 'black', 'GENERAL']);
    expect(isSquareAttacked(pos, toSquare('e5'), 'red')).toBe(true);
    expect(isSquareAttacked(pos, toSquare('e1'), 'red')).toBe(false);
  });
  it('CORE-02: blocked HORSE does not attack a destination beyond its leg', () => {
    expect(isSquareAttacked(position(['e4', 'red', 'HORSE'], ['e5', 'red', 'SOLDIER']), toSquare('f6'), 'red')).toBe(false);
  });
});
