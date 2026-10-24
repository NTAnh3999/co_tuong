import { squareToIndex, toSquare } from './square.js';
import type { Color, Piece, PieceType, Position } from './types.js';

const LETTER_TO_PIECE: Readonly<Record<string, PieceType>> = {
  K: 'GENERAL', A: 'ADVISOR', B: 'ELEPHANT', N: 'HORSE', R: 'CHARIOT', C: 'CANNON', P: 'SOLDIER',
};
const PIECE_TO_LETTER: Readonly<Record<PieceType, string>> = {
  GENERAL: 'K', ADVISOR: 'A', ELEPHANT: 'B', HORSE: 'N', CHARIOT: 'R', CANNON: 'C', SOLDIER: 'P',
};

function validatePosition(position: Position): void {
  if (position.board.length !== 90) throw new Error('Position board must contain exactly 90 squares');
  if (position.turn !== 'red' && position.turn !== 'black') throw new Error('Invalid side to move');
  if (!Number.isSafeInteger(position.halfmoveClock) || position.halfmoveClock < 0) throw new Error('Invalid halfmove clock');
  if (!Number.isSafeInteger(position.fullmoveNumber) || position.fullmoveNumber < 1) throw new Error('Invalid fullmove number');
}

/**
 * Serializes a position to Xiangqi FEN in Pikafish/UCCI form (ADR-018). Fields 3-4 are always
 * `- -`. Throws if the board size, side, counters, or any piece is invalid.
 */
export function toFen(position: Position): string {
  validatePosition(position);
  const rows: string[] = [];
  for (let rank = 9; rank >= 0; rank -= 1) {
    let row = '';
    let empty = 0;
    for (let file = 0; file < 9; file += 1) {
      const piece = position.board[rank * 9 + file];
      if (piece === null || piece === undefined) {
        empty += 1;
      } else {
        if (empty > 0) row += String(empty);
        empty = 0;
        const letter = PIECE_TO_LETTER[piece.type];
        if (letter === undefined || (piece.color !== 'red' && piece.color !== 'black')) {
          throw new Error('Position contains an invalid piece');
        }
        row += piece.color === 'red' ? letter : letter.toLowerCase();
      }
    }
    if (empty > 0) row += String(empty);
    rows.push(row);
  }
  return `${rows.join('/')} ${position.turn === 'red' ? 'w' : 'b'} - - ${position.halfmoveClock} ${position.fullmoveNumber}`;
}

/**
 * Parses a Xiangqi FEN (ADR-018 / UCCI form) into a `Position`. Throws on malformed rows, bad
 * counters, a non-empty castling/en-passant field, or a missing/misplaced General.
 */
export function fromFen(fen: string): Position {
  const fields = fen.trim().split(/\s+/);
  if (fields.length !== 6) throw new Error('FEN must contain exactly six fields');
  const [placement, side, castling, enPassant, halfmoveText, fullmoveText] = fields;
  if (placement === undefined) throw new Error('FEN is missing piece placement');
  if (side !== 'w' && side !== 'b') throw new Error('FEN side-to-move field must be w or b');
  if (castling !== '-' || enPassant !== '-') throw new Error('Xiangqi FEN fields 3 and 4 must be - -');
  if (halfmoveText === undefined || !/^\d+$/.test(halfmoveText)) throw new Error('FEN halfmove clock must be a non-negative integer');
  if (fullmoveText === undefined || !/^[1-9]\d*$/.test(fullmoveText)) throw new Error('FEN fullmove number must be a positive integer');
  const halfmoveClock = Number(halfmoveText);
  const fullmoveNumber = Number(fullmoveText);
  if (!Number.isSafeInteger(halfmoveClock) || !Number.isSafeInteger(fullmoveNumber)) throw new Error('FEN move counters exceed the safe integer range');

  const rows = placement.split('/');
  if (rows.length !== 10) throw new Error(`FEN piece placement must contain 10 rows, got ${rows.length}`);
  const board: (Piece | null)[] = Array.from({ length: 90 }, () => null);
  rows.forEach((row, rowIndex) => {
    let file = 0;
    const rank = 9 - rowIndex;
    for (const symbol of row) {
      if (/^[1-9]$/.test(symbol)) {
        file += Number(symbol);
      } else {
        const type = LETTER_TO_PIECE[symbol.toUpperCase()];
        if (type === undefined || !/^[KABNRCPkabnrcp]$/.test(symbol)) throw new Error(`Invalid FEN piece letter: ${symbol}`);
        if (file >= 9) throw new Error(`FEN row ${rowIndex + 1} exceeds 9 files`);
        const color: Color = symbol === symbol.toUpperCase() ? 'red' : 'black';
        const square = toSquare(`${String.fromCharCode(97 + file)}${rank}`);
        board[squareToIndex(square)] = { color, type };
        file += 1;
      }
      if (file > 9) throw new Error(`FEN row ${rowIndex + 1} exceeds 9 files`);
    }
    if (file !== 9) throw new Error(`FEN row ${rowIndex + 1} must contain exactly 9 files, got ${file}`);
  });

  for (const color of ['red', 'black'] as const) {
    const generals = board.flatMap((piece, index) => piece?.type === 'GENERAL' && piece.color === color ? [{ piece, index }] : []);
    if (generals.length !== 1) throw new Error(`FEN must contain exactly one ${color} General`);
    const index = generals[0]?.index;
    if (index === undefined) throw new Error(`FEN is missing the ${color} General`);
    const file = index % 9;
    const rank = Math.floor(index / 9);
    const inOwnPalace = file >= 3 && file <= 5 && (color === 'red' ? rank <= 2 : rank >= 7);
    if (!inOwnPalace) throw new Error(`${color} General must be inside its palace`);
  }

  return { board, turn: side === 'w' ? 'red' : 'black', halfmoveClock, fullmoveNumber };
}
