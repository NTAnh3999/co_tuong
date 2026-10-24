export type Square = string & { readonly __brand: 'Square' };

export type Color = 'red' | 'black';

export type PieceType =
  | 'GENERAL'
  | 'ADVISOR'
  | 'ELEPHANT'
  | 'HORSE'
  | 'CHARIOT'
  | 'CANNON'
  | 'SOLDIER';

export interface Piece {
  readonly color: Color;
  readonly type: PieceType;
}

export interface Position {
  readonly board: readonly (Piece | null)[];
  readonly turn: Color;
  readonly halfmoveClock: number;
  readonly fullmoveNumber: number;
}

export interface Move {
  readonly from: Square;
  readonly to: Square;
}
