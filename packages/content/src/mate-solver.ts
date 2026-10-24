import {
  applyMove,
  encodeMove,
  fromFen,
  getAllLegalMoves,
} from '@xq/xiangqi-core';
import type { Move, Position } from '@xq/xiangqi-core';

export interface SolveMateResult {
  readonly solved: boolean;
  readonly keyMoves: string[];
  readonly isUnique: boolean;
  readonly lines: string[][];
}

function validateDepth(n: number): void {
  if (!Number.isInteger(n) || n < 1 || n > 3) {
    throw new RangeError(`Mate depth must be an integer from 1 to 3; received ${n}`);
  }
}

function legalMoves(position: Position): Move[] {
  return getAllLegalMoves(position, position.turn);
}

/** Whether the move just made forces a loss within `remaining` attacker moves. */
function moveForcesMateIn(positionAfterMove: Position, remaining: number): boolean {
  if (remaining === 1) return legalMoves(positionAfterMove).length === 0;

  const defenses = legalMoves(positionAfterMove);
  // The defense side already lost before the claimed final attacking move.
  if (defenses.length === 0) return false;

  return defenses.every((defense) => canForceMateIn(applyMove(positionAfterMove, defense), remaining - 1));
}

function canForceMateIn(position: Position, n: number): boolean {
  if (n < 1) return false;
  return legalMoves(position).some((move) => moveForcesMateIn(applyMove(position, move), n));
}

/**
 * Reports whether the side to move can force a loss on the opponent's turn in exactly `n`
 * of its own moves. The search follows the project's casual rules: any position with no legal
 * moves loses, whether or not the general is in check.
 */
export function isExactMateInN(position: Position, n: number): boolean {
  validateDepth(n);
  return canForceMateIn(position, n) && (n === 1 || !canForceMateIn(position, n - 1));
}

function firstForcedContinuation(position: Position, n: number): string[] | undefined {
  for (const move of legalMoves(position)) {
    const afterMove = applyMove(position, move);
    if (!moveForcesMateIn(afterMove, n)) continue;

    const line = [encodeMove(move)];
    if (n === 1) return line;

    const firstDefense = legalMoves(afterMove)[0];
    if (firstDefense === undefined) continue;
    const continuation = firstForcedContinuation(applyMove(afterMove, firstDefense), n - 1);
    if (continuation !== undefined) return [...line, encodeMove(firstDefense), ...continuation];
  }
  return undefined;
}

/**
 * Finds every forcing first move for a FEN and provides one illustrative forced line per move.
 * Defenses are universally checked, while only the root move is required to be unique.
 */
export function solveMateInN(fen: string, n: number): SolveMateResult {
  validateDepth(n);
  const position = fromFen(fen);
  const keyMoves: string[] = [];
  const lines: string[][] = [];

  for (const move of legalMoves(position)) {
    const afterMove = applyMove(position, move);
    if (!moveForcesMateIn(afterMove, n)) continue;
    keyMoves.push(encodeMove(move));

    let line = [encodeMove(move)];
    if (n > 1) {
      const firstDefense = legalMoves(afterMove)[0];
      if (firstDefense !== undefined) {
        const continuation = firstForcedContinuation(applyMove(afterMove, firstDefense), n - 1);
        if (continuation !== undefined) line = [...line, encodeMove(firstDefense), ...continuation];
      }
    }
    lines.push(line);
  }

  return {
    solved: keyMoves.length > 0,
    keyMoves,
    isUnique: keyMoves.length === 1,
    lines,
  };
}
