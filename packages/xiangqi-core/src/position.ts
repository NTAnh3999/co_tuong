import type { Color, Piece, PieceType, Position } from './types.js';

const BACK_RANK: readonly PieceType[] = [
  'CHARIOT', 'HORSE', 'ELEPHANT', 'ADVISOR', 'GENERAL',
  'ADVISOR', 'ELEPHANT', 'HORSE', 'CHARIOT',
];

/** Returns a fresh standard starting position with Red to move. Each call builds a new object. */
export function createInitialPosition(): Position {
  const board: (Piece | null)[] = Array.from({ length: 90 }, () => null);
  const place = (file: number, rank: number, color: Color, type: PieceType): void => {
    board[rank * 9 + file] = { color, type };
  };

  for (let file = 0; file < 9; file += 1) {
    const type = BACK_RANK[file];
    if (type === undefined) throw new Error('Invalid back-rank definition');
    place(file, 0, 'red', type);
    place(file, 9, 'black', type);
  }
  for (const file of [1, 7]) {
    place(file, 2, 'red', 'CANNON');
    place(file, 7, 'black', 'CANNON');
  }
  for (const file of [0, 2, 4, 6, 8]) {
    place(file, 3, 'red', 'SOLDIER');
    place(file, 6, 'black', 'SOLDIER');
  }
  return { board, turn: 'red', halfmoveClock: 0, fullmoveNumber: 1 };
}
