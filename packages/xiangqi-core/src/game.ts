import { fromFen, toFen } from './fen.js';
import { applyMove, getAllLegalMoves, isInCheck, isLegalMove } from './legality.js';
import { squareToIndex } from './square.js';
import type { Color, Move, Piece, PieceType, Position } from './types.js';

/** Why a game ended. Position-based reasons come from `evaluateGame` (ADR-017); the rest come from terminal events. */
export type ResultReason =
  | 'CHECKMATE'
  | 'STALEMATE'
  | 'PERPETUAL_CHECK'
  | 'REPETITION'
  | 'MOVE_LIMIT'
  | 'INSUFFICIENT_MATERIAL'
  | 'RESIGNATION'
  | 'DRAW_AGREEMENT'
  | 'TIMEOUT'
  | 'TIMEOUT_INSUFFICIENT_MATERIAL'
  | 'ABANDONMENT'
  | 'ABORTED';

/** A finished-game outcome. `winner` is null for draws and other no-winner results. */
export interface GameResult {
  readonly winner: Color | null;
  readonly reason: ResultReason;
}

/** An externally-supplied end event (resignation, agreed draw, clock timeout, abandonment, abort). */
export type TerminalEvent =
  | { readonly type: 'RESIGNATION'; readonly loser: Color }
  | { readonly type: 'DRAW_AGREEMENT' }
  | { readonly type: 'TIMEOUT'; readonly loser: Color }
  | { readonly type: 'ABANDONMENT'; readonly loser: Color }
  | { readonly type: 'ABORTED' };

/** A serialized game: start FEN, UCI-decodable moves, rule-set version, and optional terminal event. */
export interface GameRecord {
  readonly initialFen: string;
  readonly moves: readonly Move[];
  readonly ruleSetVersion: string;
  readonly terminalEvent?: TerminalEvent;
}

/** One reached position in a replay. `ply` 0 is the start position (`move` null); `captured` is the piece taken by `move`. */
export interface ReplayStep {
  readonly ply: number;
  readonly position: Position;
  readonly move: Move | null;
  readonly isCheck: boolean;
  readonly captured: Piece | null;
}

/** Adjudication parameters. `version` identifies the rules; `noCaptureLimitPlies` is the ADR-017 no-capture draw limit. */
export interface RuleSet {
  readonly version: string;
  readonly noCaptureLimitPlies: number;
}

/** The ADR-017 casual ruleset (`xq-casual-1.0.0`, 120-ply no-capture limit). */
export const CASUAL_RULESET: RuleSet = {
  version: 'xq-casual-1.0.0',
  noCaptureLimitPlies: 120,
};

/** Board placement and side to move, excluding FEN move counters. */
export function positionKey(position: Position): string {
  return toFen(position).split(' ').slice(0, 2).join(' ');
}

/** Rebuilds every reached position and validates each move against the rules engine. */
export function replay(record: GameRecord): readonly ReplayStep[] {
  let position = fromFen(record.initialFen);
  const steps: ReplayStep[] = [{
    ply: 0,
    position,
    move: null,
    isCheck: isInCheck(position, position.turn),
    captured: null,
  }];

  for (const [index, move] of record.moves.entries()) {
    if (!isLegalMove(position, move)) {
      throw new Error(`Illegal move at ply ${index + 1}: ${move.from}${move.to}`);
    }
    const captured = position.board[squareToIndex(move.to)] ?? null;
    position = applyMove(position, move);
    steps.push({
      ply: index + 1,
      position,
      move,
      isCheck: isInCheck(position, position.turn),
      captured,
    });
  }

  return steps;
}

const ATTACKING_MATERIAL: readonly PieceType[] = ['CHARIOT', 'HORSE', 'CANNON', 'SOLDIER'];

function hasAttackingMaterial(position: Position, color?: Color): boolean {
  return position.board.some((piece) => piece !== null
    && (color === undefined || piece.color === color)
    && ATTACKING_MATERIAL.includes(piece.type));
}

function otherColor(color: Color): Color {
  return color === 'red' ? 'black' : 'red';
}

/**
 * Scans the whole history in ply order and adjudicates at the EARLIEST ply where any
 * position key reaches its 3rd occurrence — not just whether the final position's key
 * happens to have 3+ occurrences "by the end." A `GameRecord` can legally contain moves
 * played after the point a repetition should have ended the game (e.g. a replayed/
 * reconstructed record, or a client that kept moving); without this, a later move could
 * silently turn an already-decided PERPETUAL_CHECK loss into a REPETITION draw. Found by
 * T1.10's independent review with a concrete counterexample — see .agents/LEDGER.md.
 */
function repetitionResult(steps: readonly ReplayStep[]): GameResult | null {
  const occurrencesByKey = new Map<string, number[]>();

  for (const step of steps) {
    const key = positionKey(step.position);
    const occurrences = occurrencesByKey.get(key);
    if (occurrences === undefined) {
      occurrencesByKey.set(key, [step.ply]);
      continue;
    }
    occurrences.push(step.ply);
    if (occurrences.length !== 3) continue;

    const firstPly = occurrences[0];
    if (firstPly === undefined) continue;
    const thirdPly = step.ply;

    const allChecks: Record<Color, boolean> = { red: true, black: true };
    const moved: Record<Color, boolean> = { red: false, black: false };
    for (let ply = firstPly + 1; ply <= thirdPly; ply += 1) {
      const current = steps[ply];
      const previous = steps[ply - 1];
      if (current === undefined || previous === undefined) continue;
      const mover = previous.position.turn;
      moved[mover] = true;
      allChecks[mover] = allChecks[mover] && current.isCheck;
    }

    const redPerpetual = moved.red && allChecks.red;
    const blackPerpetual = moved.black && allChecks.black;
    if (redPerpetual !== blackPerpetual) {
      const loser: Color = redPerpetual ? 'red' : 'black';
      return { winner: otherColor(loser), reason: 'PERPETUAL_CHECK' };
    }
    return { winner: null, reason: 'REPETITION' };
  }

  return null;
}

/** Applies the casual ruleset in its prescribed adjudication order. */
export function evaluateGame(record: GameRecord, ruleSet: RuleSet): GameResult | null {
  const steps = replay(record);
  const final = steps[steps.length - 1];
  if (final === undefined) throw new Error('Replay did not produce an initial position');

  if (getAllLegalMoves(final.position, final.position.turn).length === 0) {
    const loser = final.position.turn;
    return {
      winner: otherColor(loser),
      reason: isInCheck(final.position, loser) ? 'CHECKMATE' : 'STALEMATE',
    };
  }

  const repetition = repetitionResult(steps);
  if (repetition !== null) return repetition;

  if (final.position.halfmoveClock >= ruleSet.noCaptureLimitPlies) {
    return { winner: null, reason: 'MOVE_LIMIT' };
  }

  if (!hasAttackingMaterial(final.position)) {
    return { winner: null, reason: 'INSUFFICIENT_MATERIAL' };
  }

  const event = record.terminalEvent;
  if (event === undefined) return null;

  switch (event.type) {
    case 'RESIGNATION':
      return { winner: otherColor(event.loser), reason: 'RESIGNATION' };
    case 'DRAW_AGREEMENT':
      return { winner: null, reason: 'DRAW_AGREEMENT' };
    case 'TIMEOUT': {
      const winner = otherColor(event.loser);
      return hasAttackingMaterial(final.position, winner)
        ? { winner, reason: 'TIMEOUT' }
        : { winner: null, reason: 'TIMEOUT_INSUFFICIENT_MATERIAL' };
    }
    case 'ABANDONMENT':
      return { winner: otherColor(event.loser), reason: 'ABANDONMENT' };
    case 'ABORTED':
      return { winner: null, reason: 'ABORTED' };
  }
}
