import { getAllPseudoLegalMoves, getPseudoLegalMoves, isSquareAttacked } from './moves.js';
import { encodeMove } from './move.js';
import { indexToSquare, squareToIndex } from './square.js';
import type { Color, Move, Position, Square } from './types.js';

function otherColor(color: Color): Color {
  return color === 'red' ? 'black' : 'red';
}

function findGeneral(position: Position, color: Color): number {
  let found = -1;
  for (let index = 0; index < position.board.length; index += 1) {
    const piece = position.board[index];
    if (piece?.color === color && piece.type === 'GENERAL') {
      if (found !== -1) throw new Error(`Malformed position: multiple ${color} Generals`);
      found = index;
    }
  }
  if (found === -1) throw new Error(`Malformed position: missing ${color} General`);
  return found;
}

/**
 * Returns true when `color`'s General is attacked, or the two Generals face each other on an
 * open file. Throws if either side lacks exactly one General. Pure.
 */
export function isInCheck(position: Position, color: Color): boolean {
  const ownGeneral = findGeneral(position, color);
  const enemyGeneral = findGeneral(position, otherColor(color));
  if (isSquareAttacked(position, indexToSquare(ownGeneral), otherColor(color))) return true;

  const ownFile = ownGeneral % 9;
  if (enemyGeneral % 9 !== ownFile) return false;
  const lowRank = Math.floor(Math.min(ownGeneral, enemyGeneral) / 9);
  const highRank = Math.floor(Math.max(ownGeneral, enemyGeneral) / 9);
  for (let rank = lowRank + 1; rank < highRank; rank += 1) {
    if (position.board[rank * 9 + ownFile] !== null) return false;
  }
  return true;
}

/**
 * Applies a move without mutating the input position or its board, and returns the next position
 * (side flipped, counters updated). Does not validate legality; throws if `move.from` is empty.
 */
export function applyMove(position: Position, move: Move): Position {
  const from = squareToIndex(move.from);
  const to = squareToIndex(move.to);
  const movingPiece = position.board[from];
  if (movingPiece === null || movingPiece === undefined) {
    throw new Error(`Cannot apply move ${encodeMove(move)}: no piece at ${move.from}`);
  }
  const capturedPiece = position.board[to];
  const board = position.board.slice();
  board[from] = null;
  board[to] = movingPiece;
  return {
    board,
    turn: otherColor(position.turn),
    halfmoveClock: capturedPiece == null ? position.halfmoveClock + 1 : 0,
    fullmoveNumber: position.fullmoveNumber + (position.turn === 'black' ? 1 : 0),
  };
}

function filterLegal(position: Position, candidates: readonly Move[], color: Color): Move[] {
  return candidates.filter((move) => {
    // Capturing a General is not a legal Xiangqi move; games end at checkmate.
    if (position.board[squareToIndex(move.to)]?.type === 'GENERAL') return false;
    return !isInCheck(applyMove(position, move), color);
  });
}

/**
 * Legal moves for the piece on `square` (no check left on its own General, General captures
 * excluded), independent of whose turn it is. Returns `[]` for an empty square. Pure.
 */
export function getLegalMoves(position: Position, square: Square): Move[] {
  const piece = position.board[squareToIndex(square)];
  if (piece === null || piece === undefined) return [];
  return filterLegal(position, getPseudoLegalMoves(position, square), piece.color);
}

/** All legal moves for pieces of `color`, independent of `position.turn`. Pure. */
export function getAllLegalMoves(position: Position, color: Color): Move[] {
  return filterLegal(position, getAllPseudoLegalMoves(position, color), color);
}

/** True when the move is legal for the side to move (`position.turn`). Pure. */
export function isLegalMove(position: Position, move: Move): boolean {
  const piece = position.board[squareToIndex(move.from)];
  if (piece === null || piece === undefined || piece.color !== position.turn) return false;
  return filterLegal(position, getPseudoLegalMoves(position, move.from), piece.color)
    .some((candidate) => candidate.to === move.to);
}

function validateDepth(depth: number): void {
  if (!Number.isInteger(depth) || depth < 0) throw new Error(`Invalid perft depth: ${depth}`);
}

/**
 * Counts leaf nodes of the legal-move tree to `depth` plies from `position` (side to move first).
 * Used as a move-generation regression check. Throws if `depth` is not a non-negative integer.
 */
export function perft(position: Position, depth: number): number {
  validateDepth(depth);
  if (depth === 0) return 1;
  const moves = getAllLegalMoves(position, position.turn);
  if (depth === 1) return moves.length;
  return moves.reduce((total, move) => total + perft(applyMove(position, move), depth - 1), 0);
}

/**
 * Per-root-move perft breakdown: `moves` maps each legal root move's UCI string to its subtree
 * count at `depth - 1`, and `total` is the perft sum. Throws if `depth` is invalid.
 */
export function divide(position: Position, depth: number): { moves: Record<string, number>; total: number } {
  validateDepth(depth);
  if (depth === 0) return { moves: {}, total: 1 };
  const moves: Record<string, number> = {};
  let total = 0;
  for (const move of getAllLegalMoves(position, position.turn)) {
    const count = perft(applyMove(position, move), depth - 1);
    moves[encodeMove(move)] = count;
    total += count;
  }
  return { moves, total };
}
