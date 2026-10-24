import fc from 'fast-check';
import { describe, it, expect } from 'vitest';
import {
  createInitialPosition, getAllLegalMoves, applyMove, toFen, fromFen,
  isInCheck, isLegalMove,
} from './index.js';
import type { Position, Color } from './types.js';

function countPieces(position: Position): number {
  return position.board.filter((p) => p !== null).length;
}

// Deep-freezes a Position (and its board + pieces) so a mutation inside
// applyMove would throw instead of silently succeeding.
function freeze(position: Position): Position {
  for (const piece of position.board) if (piece !== null) Object.freeze(piece);
  Object.freeze(position.board);
  return Object.freeze(position);
}

describe('CORE-01..06: property-based invariants over random legal play', () => {
  it('CORE-01..06: holds piece-count, turn-alternation, FEN round-trip, and check-safety invariants after every random legal move', () => {
    fc.assert(
      fc.property(
        fc.array(fc.nat({ max: 1000 }), { minLength: 1, maxLength: 60 }),
        (choices) => {
          let position = freeze(createInitialPosition());
          let previousCount = countPieces(position);

          for (const choice of choices) {
            const legalMoves = getAllLegalMoves(position, position.turn);
            if (legalMoves.length === 0) break; // game over mid-sequence, stop here — that's fine
            const move = legalMoves[choice % legalMoves.length]!;

            // isLegalMove must agree with getAllLegalMoves for the move we're about to play.
            expect(isLegalMove(position, move)).toBe(true);

            const mover: Color = position.turn;
            const before = position;
            const next = freeze(applyMove(position, move));

            // applyMove must not have mutated the frozen input.
            expect(position).toEqual(before);

            // Piece count never increases; decreases by at most 1 (a single capture) per move.
            const nextCount = countPieces(next);
            expect(nextCount).toBeLessThanOrEqual(previousCount);
            expect(nextCount).toBeGreaterThanOrEqual(previousCount - 1);

            // Exactly one General per side, always (applyMove/getLegalMoves should
            // never have allowed a General to vanish or duplicate).
            for (const color of ['red', 'black'] as const) {
              const generals = next.board.filter((p) => p?.color === color && p.type === 'GENERAL');
              expect(generals).toHaveLength(1);
            }

            // No piece type ever exceeds its starting max count, for either side
            // (captures only remove pieces, they never create one).
            const maxCounts: Record<string, number> = {
              GENERAL: 1, ADVISOR: 2, ELEPHANT: 2, HORSE: 2, CHARIOT: 2, CANNON: 2, SOLDIER: 5,
            };
            for (const color of ['red', 'black'] as const) {
              for (const [type, max] of Object.entries(maxCounts)) {
                const count = next.board.filter((p) => p?.color === color && p.type === type).length;
                expect(count).toBeLessThanOrEqual(max);
              }
            }

            // Turn alternates.
            expect(next.turn).toBe(mover === 'red' ? 'black' : 'red');

            // The mover must not be left in check (legality guarantee, re-verified
            // end-to-end through random play rather than just unit-tested in isolation).
            expect(isInCheck(next, mover)).toBe(false);

            // FEN round-trip holds for every reached position, not just the start.
            expect(fromFen(toFen(next))).toEqual(next);

            position = next;
            previousCount = nextCount;
          }
        },
      ),
      { numRuns: 200 },
    );
  });
});
