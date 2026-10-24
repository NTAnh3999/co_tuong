import { indexToSquare, squareToIndex } from './square.js';
import type { Color, Move, Piece, Position, Square } from './types.js';

type Point = { readonly file: number; readonly rank: number };

const ORTHOGONAL: readonly Point[] = [
  { file: 1, rank: 0 }, { file: -1, rank: 0 },
  { file: 0, rank: 1 }, { file: 0, rank: -1 },
];
const DIAGONAL: readonly Point[] = [
  { file: 1, rank: 1 }, { file: 1, rank: -1 },
  { file: -1, rank: 1 }, { file: -1, rank: -1 },
];

function inside(file: number, rank: number): boolean {
  return file >= 0 && file < 9 && rank >= 0 && rank < 10;
}

function pieceAt(position: Position, file: number, rank: number): Piece | null {
  if (!inside(file, rank)) return null;
  return position.board[rank * 9 + file] ?? null;
}

function inPalace(color: Color, file: number, rank: number): boolean {
  return file >= 3 && file <= 5 && (color === 'red' ? rank >= 0 && rank <= 2 : rank >= 7 && rank <= 9);
}

function addMove(
  position: Position,
  from: Square,
  color: Color,
  file: number,
  rank: number,
  moves: Move[],
): void {
  if (!inside(file, rank)) return;
  if (pieceAt(position, file, rank)?.color === color) return;
  moves.push({ from, to: indexToSquare(rank * 9 + file) });
}

function generate(position: Position, from: Square, piece: Piece, attacksOnly = false): Move[] {
  const fromIndex = squareToIndex(from);
  const file = fromIndex % 9;
  const rank = Math.floor(fromIndex / 9);
  const moves: Move[] = [];
  const addStep = (df: number, dr: number, palaceOnly = false): void => {
    const targetFile = file + df;
    const targetRank = rank + dr;
    if (palaceOnly && !inPalace(piece.color, targetFile, targetRank)) return;
    addMove(position, from, piece.color, targetFile, targetRank, moves);
  };

  switch (piece.type) {
    case 'GENERAL':
      for (const direction of ORTHOGONAL) addStep(direction.file, direction.rank, true);
      break;
    case 'ADVISOR':
      for (const direction of DIAGONAL) addStep(direction.file, direction.rank, true);
      break;
    case 'ELEPHANT':
      for (const direction of DIAGONAL) {
        const targetFile = file + direction.file * 2;
        const targetRank = rank + direction.rank * 2;
        const staysHome = piece.color === 'red' ? targetRank <= 4 : targetRank >= 5;
        if (staysHome && pieceAt(position, file + direction.file, rank + direction.rank) === null) {
          addStep(direction.file * 2, direction.rank * 2);
        }
      }
      break;
    case 'HORSE':
      for (const df of [-2, -1, 1, 2]) {
        for (const dr of [-2, -1, 1, 2]) {
          if (Math.abs(df) + Math.abs(dr) !== 3) continue;
          const legFile = Math.abs(df) === 2 ? file + Math.sign(df) : file;
          const legRank = Math.abs(dr) === 2 ? rank + Math.sign(dr) : rank;
          if (pieceAt(position, legFile, legRank) === null) addStep(df, dr);
        }
      }
      break;
    case 'CHARIOT':
      for (const direction of ORTHOGONAL) {
        for (let distance = 1; ; distance += 1) {
          const targetFile = file + direction.file * distance;
          const targetRank = rank + direction.rank * distance;
          if (!inside(targetFile, targetRank)) break;
          const occupant = pieceAt(position, targetFile, targetRank);
          if (occupant === null) moves.push({ from, to: indexToSquare(targetRank * 9 + targetFile) });
          else {
            if (occupant.color !== piece.color) moves.push({ from, to: indexToSquare(targetRank * 9 + targetFile) });
            break;
          }
        }
      }
      break;
    case 'CANNON':
      for (const direction of ORTHOGONAL) {
        let screenCount = 0;
        for (let distance = 1; ; distance += 1) {
          const targetFile = file + direction.file * distance;
          const targetRank = rank + direction.rank * distance;
          if (!inside(targetFile, targetRank)) break;
          const occupant = pieceAt(position, targetFile, targetRank);
          if (occupant === null) {
            if (screenCount === 0 && !attacksOnly) {
              moves.push({ from, to: indexToSquare(targetRank * 9 + targetFile) });
            }
          } else if (screenCount === 0) {
            screenCount = 1;
          } else {
            if (occupant.color !== piece.color) moves.push({ from, to: indexToSquare(targetRank * 9 + targetFile) });
            break;
          }
        }
      }
      break;
    case 'SOLDIER': {
      const forward = piece.color === 'red' ? 1 : -1;
      addStep(0, forward);
      const crossedRiver = piece.color === 'red' ? rank >= 5 : rank <= 4;
      if (crossedRiver) {
        addStep(-1, 0);
        addStep(1, 0);
      }
      break;
    }
  }

  return moves;
}

/** Returns the piece's pseudo-legal moves, independent of `position.turn`. */
export function getPseudoLegalMoves(position: Position, square: Square): Move[] {
  const piece = position.board[squareToIndex(square)];
  return piece === null || piece === undefined ? [] : generate(position, square, piece);
}

/** Returns all pseudo-legal moves belonging to `color`. */
export function getAllPseudoLegalMoves(position: Position, color: Color): Move[] {
  const moves: Move[] = [];
  for (let index = 0; index < position.board.length; index += 1) {
    const piece = position.board[index];
    if (piece === null || piece === undefined || piece.color !== color) continue;
    moves.push(...generate(position, indexToSquare(index), piece));
  }
  return moves;
}

/** True when a piece of `byColor` has a capture pattern reaching `square`. */
export function isSquareAttacked(position: Position, square: Square, byColor: Color): boolean {
  for (let index = 0; index < position.board.length; index += 1) {
    const piece = position.board[index];
    if (piece === null || piece === undefined || piece.color !== byColor) continue;
    const from = indexToSquare(index);
    if (generate(position, from, piece, piece.type === 'CANNON').some((move) => move.to === square)) return true;
  }
  return false;
}
