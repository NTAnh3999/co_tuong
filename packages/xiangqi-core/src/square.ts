import type { Square } from './types.js';

/** Validates an ADR-018 square string (`a`-`i` file, `0`-`9` rank) and brands it as `Square`. Throws on invalid input. */
export function toSquare(input: string): Square {
  if (!/^[a-i][0-9]$/.test(input)) {
    throw new Error(`Invalid square: ${JSON.stringify(input)}`);
  }
  return input as Square;
}

/** Maps a square to its board index `rank * 9 + file`. Throws if the square is malformed. */
export function squareToIndex(square: Square): number {
  // Keep runtime validation even though callers normally hold the branded type.
  const validSquare = toSquare(square);
  return Number(validSquare[1]) * 9 + validSquare.charCodeAt(0) - 97;
}

/** Maps a board index in `[0, 90)` to its square. Throws on non-integer or out-of-range indices. */
export function indexToSquare(index: number): Square {
  if (!Number.isInteger(index) || index < 0 || index >= 90) {
    throw new Error(`Invalid board index: ${index}`);
  }
  const file = String.fromCharCode(97 + (index % 9));
  const rank = Math.floor(index / 9);
  return toSquare(`${file}${rank}`);
}
