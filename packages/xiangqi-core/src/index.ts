export type { Color, Move, Piece, PieceType, Position, Square } from './types.js';
export { toSquare, squareToIndex, indexToSquare } from './square.js';
export { createInitialPosition } from './position.js';
export { toFen, fromFen } from './fen.js';
export { encodeMove, decodeMove } from './move.js';
export { getPseudoLegalMoves, getAllPseudoLegalMoves, isSquareAttacked } from './moves.js';
export { isInCheck, getLegalMoves, getAllLegalMoves, isLegalMove, applyMove, perft, divide } from './legality.js';
export {
  CASUAL_RULESET, replay, positionKey, evaluateGame,
} from './game.js';
export type {
  ResultReason, GameResult, TerminalEvent, GameRecord, ReplayStep, RuleSet,
} from './game.js';
