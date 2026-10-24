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
  it('CORE-02: GENERAL at palace corner d0 has exactly 2 destinations', () => {
    expect(destinations(position(['d0', 'red', 'GENERAL']), 'd0')).toEqual(['d1', 'e0']);
  });
  it('CORE-02: GENERAL at palace corner d2 has exactly 2 destinations', () => {
    expect(destinations(position(['d2', 'red', 'GENERAL']), 'd2')).toEqual(['d1', 'e2']);
  });
  it('CORE-02: GENERAL at palace corner f0 has exactly 2 destinations', () => {
    expect(destinations(position(['f0', 'red', 'GENERAL']), 'f0')).toEqual(['e0', 'f1']);
  });
  it('CORE-02: GENERAL at palace corner f2 has exactly 2 destinations', () => {
    expect(destinations(position(['f2', 'red', 'GENERAL']), 'f2')).toEqual(['e2', 'f1']);
  });
  it('CORE-02: GENERAL at palace center has 4 destinations', () => {
    expect(destinations(position(['e1', 'red', 'GENERAL']), 'e1')).toEqual(['d1', 'e0', 'e2', 'f1']);
  });
  it('CORE-02: BLACK GENERAL at palace center e8 has 4 destinations', () => {
    expect(destinations(position(['e8', 'black', 'GENERAL']), 'e8')).toEqual(['d8', 'e7', 'e9', 'f8']);
  });
  it('CORE-02: GENERAL blocked by friendly on all 4 sides has no moves', () => {
    expect(destinations(position(['e1', 'red', 'GENERAL'], ['d1', 'red', 'SOLDIER'], ['e0', 'red', 'SOLDIER'], ['e2', 'red', 'SOLDIER'], ['f1', 'red', 'SOLDIER']), 'e1')).toEqual([]);
  });
  it('CORE-02: GENERAL can capture enemy piece on one side', () => {
    expect(destinations(position(['e1', 'red', 'GENERAL'], ['e2', 'black', 'SOLDIER']), 'e1')).toContain('e2');
  });
  it('CORE-02: GENERAL blocked by friendly on one side, open on others', () => {
    expect(destinations(position(['e1', 'red', 'GENERAL'], ['d1', 'red', 'SOLDIER']), 'e1')).toEqual(['e0', 'e2', 'f1']);
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
  it('CORE-02: ADVISOR at corner d0 has exactly 1 destination (center)', () => {
    expect(destinations(position(['d0', 'red', 'ADVISOR']), 'd0')).toEqual(['e1']);
  });
  it('CORE-02: ADVISOR at corner d2 has exactly 1 destination (center)', () => {
    expect(destinations(position(['d2', 'red', 'ADVISOR']), 'd2')).toEqual(['e1']);
  });
  it('CORE-02: ADVISOR at corner f0 has exactly 1 destination (center)', () => {
    expect(destinations(position(['f0', 'red', 'ADVISOR']), 'f0')).toEqual(['e1']);
  });
  it('CORE-02: ADVISOR at corner f2 has exactly 1 destination (center)', () => {
    expect(destinations(position(['f2', 'red', 'ADVISOR']), 'f2')).toEqual(['e1']);
  });
  it('CORE-02: ADVISOR at palace center has 4 destinations', () => {
    expect(destinations(position(['e1', 'red', 'ADVISOR']), 'e1')).toEqual(['d0', 'd2', 'f0', 'f2']);
  });
  it('CORE-02: BLACK ADVISOR at palace center e8 has 4 destinations', () => {
    expect(destinations(position(['e8', 'black', 'ADVISOR']), 'e8')).toEqual(['d7', 'd9', 'f7', 'f9']);
  });
  it('CORE-02: ADVISOR can capture enemy piece on diagonal', () => {
    expect(destinations(position(['e1', 'red', 'ADVISOR'], ['f2', 'black', 'SOLDIER']), 'e1')).toContain('f2');
  });
  it('CORE-02: ADVISOR blocked by friendly on one diagonal', () => {
    expect(destinations(position(['e1', 'red', 'ADVISOR'], ['f2', 'red', 'SOLDIER']), 'e1')).toEqual(['d0', 'd2', 'f0']);
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
  it('CORE-02: ELEPHANT blocked on up-right diagonal by eye at f3', () => {
    expect(destinations(position(['e2', 'red', 'ELEPHANT'], ['f3', 'red', 'SOLDIER']), 'e2')).not.toContain('g4');
  });
  it('CORE-02: ELEPHANT blocked on up-left diagonal by eye at d3', () => {
    expect(destinations(position(['e2', 'red', 'ELEPHANT'], ['d3', 'red', 'SOLDIER']), 'e2')).not.toContain('c4');
  });
  it('CORE-02: ELEPHANT blocked on down-right diagonal by eye at f1', () => {
    expect(destinations(position(['e2', 'red', 'ELEPHANT'], ['f1', 'red', 'SOLDIER']), 'e2')).not.toContain('g0');
  });
  it('CORE-02: ELEPHANT blocked on down-left diagonal by eye at d1', () => {
    expect(destinations(position(['e2', 'red', 'ELEPHANT'], ['d1', 'red', 'SOLDIER']), 'e2')).not.toContain('c0');
  });
  it('CORE-02: ELEPHANT with 2 of 4 diagonals blocked by eyes', () => {
    const moves = destinations(position(['e2', 'red', 'ELEPHANT'], ['f3', 'red', 'SOLDIER'], ['d1', 'red', 'SOLDIER']), 'e2');
    expect(moves).toEqual(['c4', 'g0']);
  });
  it('CORE-02: BLACK ELEPHANT at black side stays rank >= 5', () => {
    expect(destinations(position(['e7', 'black', 'ELEPHANT']), 'e7')).toEqual(['c5', 'c9', 'g5', 'g9']);
  });
  it('CORE-02: ELEPHANT at board corner a0 has only 1 destination', () => {
    expect(destinations(position(['a0', 'red', 'ELEPHANT']), 'a0')).toEqual(['c2']);
  });
  it('CORE-02: ELEPHANT at board corner i0 has only 1 destination', () => {
    expect(destinations(position(['i0', 'red', 'ELEPHANT']), 'i0')).toEqual(['g2']);
  });
  it('CORE-02: ELEPHANT at board edge respects board boundaries', () => {
    expect(destinations(position(['a2', 'red', 'ELEPHANT']), 'a2')).toEqual(['c0', 'c4']);
  });
  it('CORE-02: ELEPHANT at river boundary cannot move into river', () => {
    expect(destinations(position(['e4', 'red', 'ELEPHANT']), 'e4')).toEqual(['c2', 'g2']);
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
  it('CORE-02: HORSE blocked on up move (north leg) cannot reach two up-diagonals', () => {
    expect(destinations(position(['e4', 'red', 'HORSE'], ['e5', 'red', 'SOLDIER']), 'e4')).not.toContain('d6');
    expect(destinations(position(['e4', 'red', 'HORSE'], ['e5', 'red', 'SOLDIER']), 'e4')).not.toContain('f6');
  });
  it('CORE-02: HORSE blocked on down move (south leg) cannot reach two down-diagonals', () => {
    expect(destinations(position(['e4', 'red', 'HORSE'], ['e3', 'red', 'SOLDIER']), 'e4')).not.toContain('d2');
    expect(destinations(position(['e4', 'red', 'HORSE'], ['e3', 'red', 'SOLDIER']), 'e4')).not.toContain('f2');
  });
  it('CORE-02: HORSE blocked on right move (east leg) cannot reach two right-diagonals', () => {
    expect(destinations(position(['e4', 'red', 'HORSE'], ['f4', 'red', 'SOLDIER']), 'e4')).not.toContain('g3');
    expect(destinations(position(['e4', 'red', 'HORSE'], ['f4', 'red', 'SOLDIER']), 'e4')).not.toContain('g5');
  });
  it('CORE-02: HORSE blocked on left move (west leg) cannot reach two left-diagonals', () => {
    expect(destinations(position(['e4', 'red', 'HORSE'], ['d4', 'red', 'SOLDIER']), 'e4')).not.toContain('c3');
    expect(destinations(position(['e4', 'red', 'HORSE'], ['d4', 'red', 'SOLDIER']), 'e4')).not.toContain('c5');
  });
  it('CORE-02: HORSE at corner a0 has only 2 of 8 possible L-destinations', () => {
    expect(destinations(position(['a0', 'red', 'HORSE']), 'a0')).toEqual(['b2', 'c1']);
  });
  it('CORE-02: HORSE at edge file a4 has 4 of 8 destinations', () => {
    expect(destinations(position(['a4', 'red', 'HORSE']), 'a4')).toHaveLength(4);
  });
  it('CORE-02: HORSE can capture enemy on one L-destination', () => {
    expect(destinations(position(['e4', 'red', 'HORSE'], ['f6', 'black', 'SOLDIER']), 'e4')).toContain('f6');
  });
  it('CORE-02: HORSE cannot move to square occupied by friendly piece', () => {
    expect(destinations(position(['e4', 'red', 'HORSE'], ['f6', 'red', 'SOLDIER']), 'e4')).not.toContain('f6');
  });
  it('CORE-02: HORSE with destination occupied by friendly blocks L-move but leg is open', () => {
    expect(destinations(position(['e4', 'red', 'HORSE'], ['d6', 'red', 'SOLDIER']), 'e4')).not.toContain('d6');
    expect(destinations(position(['e4', 'red', 'HORSE'], ['d6', 'red', 'SOLDIER']), 'e4')).toContain('f6');
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
  it('CORE-02: CHARIOT in corner has exactly 2 directions with moves', () => {
    expect(destinations(position(['a0', 'red', 'CHARIOT']), 'a0')).toHaveLength(17);
  });
  it('CORE-02: CHARIOT blocked by friendly on north side only', () => {
    const moves = destinations(position(['e4', 'red', 'CHARIOT'], ['e5', 'red', 'SOLDIER']), 'e4');
    expect(moves).not.toContain('e5');
    expect(moves).not.toContain('e6');
  });
  it('CORE-02: CHARIOT blocked by friendly on south side only', () => {
    const moves = destinations(position(['e4', 'red', 'CHARIOT'], ['e3', 'red', 'SOLDIER']), 'e4');
    expect(moves).not.toContain('e3');
    expect(moves).not.toContain('e2');
  });
  it('CORE-02: CHARIOT blocked by friendly on east side only', () => {
    const moves = destinations(position(['e4', 'red', 'CHARIOT'], ['f4', 'red', 'SOLDIER']), 'e4');
    expect(moves).not.toContain('f4');
    expect(moves).not.toContain('g4');
  });
  it('CORE-02: CHARIOT blocked by friendly on west side only', () => {
    const moves = destinations(position(['e4', 'red', 'CHARIOT'], ['d4', 'red', 'SOLDIER']), 'e4');
    expect(moves).not.toContain('d4');
    expect(moves).not.toContain('c4');
  });
  it('CORE-02: CHARIOT completely boxed in by friendly pieces on all 4 sides', () => {
    expect(destinations(position(['e4', 'red', 'CHARIOT'], ['e3', 'red', 'SOLDIER'], ['e5', 'red', 'SOLDIER'], ['d4', 'red', 'SOLDIER'], ['f4', 'red', 'SOLDIER']), 'e4')).toEqual([]);
  });
  it('CORE-02: CHARIOT can capture enemy at distance', () => {
    expect(destinations(position(['e4', 'red', 'CHARIOT'], ['e6', 'black', 'SOLDIER']), 'e4')).toContain('e6');
  });
  it('CORE-02: CHARIOT captures first enemy but not those beyond', () => {
    const moves = destinations(position(['e4', 'red', 'CHARIOT'], ['e6', 'black', 'SOLDIER'], ['e8', 'black', 'GENERAL']), 'e4');
    expect(moves).toContain('e6');
    expect(moves).not.toContain('e8');
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
  it('CORE-02: CANNON captures through one-screen capture northward', () => {
    const moves = destinations(position(['e4', 'red', 'CANNON'], ['e5', 'black', 'SOLDIER'], ['e7', 'black', 'GENERAL']), 'e4');
    expect(moves).toContain('e7');
  });
  it('CORE-02: CANNON captures through one-screen capture southward', () => {
    const moves = destinations(position(['e4', 'red', 'CANNON'], ['e3', 'black', 'SOLDIER'], ['e1', 'black', 'GENERAL']), 'e4');
    expect(moves).toContain('e1');
  });
  it('CORE-02: CANNON captures through one-screen capture eastward', () => {
    const moves = destinations(position(['e4', 'red', 'CANNON'], ['f4', 'black', 'SOLDIER'], ['h4', 'black', 'GENERAL']), 'e4');
    expect(moves).toContain('h4');
  });
  it('CORE-02: CANNON captures through one-screen capture westward', () => {
    const moves = destinations(position(['e4', 'red', 'CANNON'], ['d4', 'black', 'SOLDIER'], ['b4', 'black', 'GENERAL']), 'e4');
    expect(moves).toContain('b4');
  });
  it('CORE-02: CANNON screen piece can be same color or enemy (both work as screen)', () => {
    const moves1 = destinations(position(['e4', 'red', 'CANNON'], ['e5', 'red', 'SOLDIER'], ['e7', 'black', 'GENERAL']), 'e4');
    const moves2 = destinations(position(['e4', 'red', 'CANNON'], ['e5', 'black', 'SOLDIER'], ['e7', 'black', 'GENERAL']), 'e4');
    expect(moves1).toContain('e7');
    expect(moves2).toContain('e7');
  });
  it('CORE-02: CANNON zero-screen position allows slides but not captures', () => {
    const moves = destinations(position(['e4', 'red', 'CANNON'], ['e7', 'black', 'GENERAL']), 'e4');
    expect(moves).toContain('e5');
    expect(moves).toContain('e6');
    expect(moves).not.toContain('e7');
  });
  it('CORE-02: CANNON with two screens before target cannot capture', () => {
    const moves = destinations(position(['e4', 'red', 'CANNON'], ['e5', 'red', 'SOLDIER'], ['e6', 'red', 'SOLDIER'], ['e8', 'black', 'GENERAL']), 'e4');
    expect(moves).not.toContain('e8');
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
  it('CORE-02: RED SOLDIER at rank 0 advances forward', () => {
    expect(destinations(position(['e0', 'red', 'SOLDIER']), 'e0')).toEqual(['e1']);
  });
  it('CORE-02: RED SOLDIER at rank 1 advances forward', () => {
    expect(destinations(position(['e1', 'red', 'SOLDIER']), 'e1')).toEqual(['e2']);
  });
  it('CORE-02: RED SOLDIER at rank 2 advances forward', () => {
    expect(destinations(position(['e2', 'red', 'SOLDIER']), 'e2')).toEqual(['e3']);
  });
  it('CORE-02: RED SOLDIER at rank 3 (before river) advances forward only', () => {
    expect(destinations(position(['e3', 'red', 'SOLDIER']), 'e3')).toEqual(['e4']);
  });
  it('CORE-02: RED SOLDIER at rank 4 (before river) advances forward only', () => {
    expect(destinations(position(['e4', 'red', 'SOLDIER']), 'e4')).toEqual(['e5']);
  });
  it('CORE-02: RED SOLDIER at rank 5 (after river) can move forward and sideways', () => {
    expect(destinations(position(['e5', 'red', 'SOLDIER']), 'e5')).toEqual(['d5', 'e6', 'f5']);
  });
  it('CORE-02: RED SOLDIER at rank 6 (after river) can move forward and sideways', () => {
    expect(destinations(position(['e6', 'red', 'SOLDIER']), 'e6')).toEqual(['d6', 'e7', 'f6']);
  });
  it('CORE-02: RED SOLDIER at rank 9 (far rank) has only sideways moves', () => {
    expect(destinations(position(['e9', 'red', 'SOLDIER']), 'e9')).toEqual(['d9', 'f9']);
  });
  it('CORE-02: BLACK SOLDIER at rank 9 advances forward (toward rank 8)', () => {
    expect(destinations(position(['e9', 'black', 'SOLDIER']), 'e9')).toEqual(['e8']);
  });
  it('CORE-02: BLACK SOLDIER at rank 5 (before river) advances forward only', () => {
    expect(destinations(position(['e5', 'black', 'SOLDIER']), 'e5')).toEqual(['e4']);
  });
  it('CORE-02: BLACK SOLDIER at rank 4 (after river) can move forward and sideways', () => {
    expect(destinations(position(['e4', 'black', 'SOLDIER']), 'e4')).toEqual(['d4', 'e3', 'f4']);
  });
  it('CORE-02: BLACK SOLDIER at rank 0 (far rank) has only sideways moves', () => {
    expect(destinations(position(['e0', 'black', 'SOLDIER']), 'e0')).toEqual(['d0', 'f0']);
  });
  it('CORE-02: SOLDIER blocked by friendly piece directly ahead', () => {
    expect(destinations(position(['e3', 'red', 'SOLDIER'], ['e4', 'red', 'SOLDIER']), 'e3')).toEqual([]);
  });
  it('CORE-02: SOLDIER can capture enemy piece directly ahead', () => {
    expect(destinations(position(['e3', 'red', 'SOLDIER'], ['e4', 'black', 'SOLDIER']), 'e3')).toContain('e4');
  });
  it('CORE-02: SOLDIER after crossing river blocked by friendly ahead', () => {
    expect(destinations(position(['e5', 'red', 'SOLDIER'], ['e6', 'red', 'SOLDIER']), 'e5')).toEqual(['d5', 'f5']);
  });
  it('CORE-02: SOLDIER after crossing river blocked by friendly on left', () => {
    expect(destinations(position(['e5', 'red', 'SOLDIER'], ['d5', 'red', 'SOLDIER']), 'e5')).toEqual(['e6', 'f5']);
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
