import { describe, expect, it } from 'vitest';
import { selectMove } from './difficulty.js';
import type { MultiPvLine } from './uci/commands.js';

const lines: MultiPvLine[] = [
  { multipv: 1, move: 'a0a1', scoreCp: 100 },
  { multipv: 2, move: 'b0b1', scoreCp: 20 },
  { multipv: 3, move: 'c0c1', scoreCp: 19 },
  { multipv: 4, move: 'd0d1', scoreCp: -201 },
];
describe('selectMove', () => {
  it('includes exact threshold boundary and excludes the next centipawn', () => {
    // medium's thresholdCp is 80: b0b1 is exactly 100-20=80 (included), c0c1 is
    // 100-19=81 (excluded) — only a0a1/b0b1 are reachable, so the highest roll
    // clamps to the last included candidate (b0b1), never c0c1.
    expect(selectMove(lines, 'medium', () => 0.99).move).toBe('b0b1');
    // easy's thresholdCp is 300, wide enough that a0a1/b0b1/c0c1 are ALL
    // included (d0d1 at diff 301 is the one excluded) — so the highest roll
    // DOES reach the 3rd candidate, c0c1.
    expect(selectMove(lines, 'easy', () => 0.99).move).toBe('c0c1');
  });
  it('chooses easy candidates uniformly by injected random index and hard always chooses best', () => {
    expect(selectMove(lines, 'easy', () => 0).move).toBe('a0a1');
    expect(selectMove(lines, 'hard', () => 0.99).move).toBe('a0a1');
  });
  it('uses medium 50/35/15 boundaries', () => {
    // A dedicated fixture with THREE candidates inside medium's 80cp threshold,
    // so all three weighted bands are actually reachable (the shared `lines`
    // fixture above only ever has two candidates within 80cp of the best).
    const bandLines: MultiPvLine[] = [
      { multipv: 1, move: 'a0a1', scoreCp: 100 },
      { multipv: 2, move: 'b0b1', scoreCp: 50 },
      { multipv: 3, move: 'c0c1', scoreCp: 30 },
    ];
    expect(selectMove(bandLines, 'medium', () => 0.499999).move).toBe('a0a1');
    expect(selectMove(bandLines, 'medium', () => 0.5).move).toBe('b0b1');
    expect(selectMove(bandLines, 'medium', () => 0.85).move).toBe('c0c1');
  });
});
