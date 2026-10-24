import { fromFen, toFen } from './fen.js';
import { applyMove, getAllLegalMoves, isInCheck, isLegalMove } from './legality.js';
import { squareToIndex } from './square.js';
import type { Color, Move, Piece, PieceType, Position } from './types.js';

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

export interface GameResult {
  readonly winner: Color | null;
  readonly reason: ResultReason;
}

export type TerminalEvent =
  | { readonly type: 'RESIGNATION'; readonly loser: Color }
  | { readonly type: 'DRAW_AGREEMENT' }
  | { readonly type: 'TIMEOUT'; readonly loser: Color }
  | { readonly type: 'ABANDONMENT'; readonly loser: Color }
  | { readonly type: 'ABORTED' };

export interface GameRecord {
  readonly initialFen: string;
  readonly moves: readonly Move[];
  readonly ruleSetVersion: string;
  readonly terminalEvent?: TerminalEvent;
}

export interface ReplayStep {
  readonly ply: number;
  readonly position: Position;
  readonly move: Move | null;
  readonly isCheck: boolean;
  readonly captured: Piece | null;
}

export interface RuleSet {
  readonly version: string;
  readonly noCaptureLimitPlies: number;
}

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

function repetitionResult(steps: readonly ReplayStep[]): GameResult | null {
  const final = steps[steps.length - 1];
  if (final === undefined) return null;
  const key = positionKey(final.position);
  const occurrences = steps
    .filter((step) => positionKey(step.position) === key)
    .map((step) => step.ply);
  if (occurrences.length < 3) return null;

  const firstPly = occurrences[0];
  if (firstPly === undefined) return null;
  const allChecks: Record<Color, boolean> = { red: true, black: true };
  const moved: Record<Color, boolean> = { red: false, black: false };

  for (let ply = firstPly + 1; ply <= final.ply; ply += 1) {
    const step = steps[ply];
    const previous = steps[ply - 1];
    if (step === undefined || previous === undefined) continue;
    const mover = previous.position.turn;
    moved[mover] = true;
    allChecks[mover] = allChecks[mover] && step.isCheck;
  }

  const redPerpetual = moved.red && allChecks.red;
  const blackPerpetual = moved.black && allChecks.black;
  if (redPerpetual !== blackPerpetual) {
    const loser: Color = redPerpetual ? 'red' : 'black';
    return { winner: otherColor(loser), reason: 'PERPETUAL_CHECK' };
  }
  return { winner: null, reason: 'REPETITION' };
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
