import { applyMove, decodeMove, fromFen, getAllLegalMoves } from '@xq/xiangqi-core';
import { describe, expect, it } from 'vitest';
import { isExactMateInN, solveMateInN } from './mate-solver.js';

describe('mate-in-N solver', () => {
  it('LEARN-01 finds a hand-traced unique mate in one', () => {
    // Red's rook from c6 to c9 checks along rank 9. The other red rook on e5
    // covers e8, while the checking rook covers d9 and f9; Black has no legal move.
    const fen = '4k4/4r4/9/2R6/4R4/9/9/9/9/4K4 w - - 0 1';
    const start = fromFen(fen);
    const result = solveMateInN(fen, 1);
    const afterKey = applyMove(start, decodeMove('c6c9'));

    expect(getAllLegalMoves(start, 'black').length).toBeGreaterThan(0);
    expect(getAllLegalMoves(afterKey, 'black')).toHaveLength(0);
    expect(result).toEqual({ solved: true, keyMoves: ['c6c9'], isUnique: true, lines: [['c6c9']] });
  });

  it('LEARN-01 reports two root moves that both force immediate loss', () => {
    const fen = '4k4/4r2R1/9/9/9/9/9/4R4/2R6/4K4 w - - 0 1';
    const result = solveMateInN(fen, 1);

    expect(result.solved).toBe(true);
    expect(result.keyMoves).toHaveLength(2);
    expect(result.isUnique).toBe(false);
    expect(result.keyMoves).toEqual(expect.arrayContaining(['c1c9', 'h8h9']));
    expect(result.lines).toHaveLength(2);
  });

  it('LEARN-01 checks every defense in a mate-in-two and returns a worked line', () => {
    const fen = '4k4/7r1/3R5/9/9/9/5R1r1/4R4/9/4K3R w - - 0 1';
    const position = fromFen(fen);
    const result = solveMateInN(fen, 2);
    const keyPosition = applyMove(position, decodeMove('f3h3'));
    const defenses = getAllLegalMoves(keyPosition, 'black');

    expect(result.solved).toBe(true);
    expect(result.keyMoves).toContain('f3h3');
    expect(defenses.map((move) => `${move.from}${move.to}`)).toEqual(['h8e8', 'e9f9']);
    expect(defenses).toHaveLength(2);
    for (const defense of defenses) {
      expect(isExactMateInN(applyMove(keyPosition, defense), 1)).toBe(true);
    }
    const keyIndex = result.keyMoves.indexOf('f3h3');
    const sampleLine = result.lines[keyIndex];
    expect(sampleLine).toHaveLength(3);
    expect(sampleLine?.[0]).toBe('f3h3');
    expect(defenses.map((move) => `${move.from}${move.to}`)).toContain(sampleLine?.[1]);
  });

  it('LEARN-01 rejects a non-mating claim and flags a claim slower than an available mate', () => {
    const startFen = 'rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w - - 0 1';
    const mateInOneFen = '4k4/4r4/9/2R6/4R4/9/9/9/9/4K4 w - - 0 1';

    expect(solveMateInN(startFen, 1).solved).toBe(false);
    expect(isExactMateInN(fromFen(mateInOneFen), 1)).toBe(true);
    expect(isExactMateInN(fromFen(mateInOneFen), 2)).toBe(false);
  });
});
