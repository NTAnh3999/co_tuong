import { toSquare } from './square.js';
import type { Move } from './types.js';

export function encodeMove(move: Move): string {
  return `${toSquare(move.from)}${toSquare(move.to)}`;
}

export function decodeMove(text: string): Move {
  if (text.length !== 4) {
    throw new Error(`Invalid move: expected 4 characters, got ${JSON.stringify(text)}`);
  }
  return { from: toSquare(text.slice(0, 2)), to: toSquare(text.slice(2, 4)) };
}
