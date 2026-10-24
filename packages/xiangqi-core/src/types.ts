/** A board square in ADR-018 notation (`a0`-`i9`). Create only via `toSquare`. */
export type Square = string & { readonly __brand: 'Square' };

/** The two sides. Red starts on ranks 0-4 (Red's back rank is 0). */
export type Color = 'red' | 'black';

/** The seven Xiangqi piece kinds (General, Advisor, Elephant, Horse, Chariot, Cannon, Soldier). */
export type PieceType =
  | 'GENERAL'
  | 'ADVISOR'
  | 'ELEPHANT'
  | 'HORSE'
  | 'CHARIOT'
  | 'CANNON'
  | 'SOLDIER';

/** A piece owned by one side. */
export interface Piece {
  readonly color: Color;
  readonly type: PieceType;
}

/**
 * A full game state: 90-entry board indexed by `rank * 9 + file` (null for empty),
 * side to move, and FEN halfmove/fullmove counters. Treated as immutable by the engine.
 */
export interface Position {
  readonly board: readonly (Piece | null)[];
  readonly turn: Color;
  readonly halfmoveClock: number;
  readonly fullmoveNumber: number;
}

/** A move as a from/to square pair (serialize with `encodeMove` for 4-character UCI). */
export interface Move {
  readonly from: Square;
  readonly to: Square;
}
