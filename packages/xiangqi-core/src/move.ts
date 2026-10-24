import { toSquare } from './square.js';
import type { Move } from './types.js';

/** Serializes a move as 4-character UCI (e.g. `h2e2`) per ADR-018. Throws if either square is invalid. */
export function encodeMove(move: Move): string {
  return `${toSquare(move.from)}${toSquare(move.to)}`;
}

/** Parses a 4-character UCI move string (e.g. `h2e2`) into a `Move`. Throws on wrong length or invalid squares. */
export function decodeMove(text: string): Move {
  if (text.length !== 4) {
    throw new Error(`Invalid move: expected 4 characters, got ${JSON.stringify(text)}`);
  }
  return { from: toSquare(text.slice(0, 2)), to: toSquare(text.slice(2, 4)) };
}
