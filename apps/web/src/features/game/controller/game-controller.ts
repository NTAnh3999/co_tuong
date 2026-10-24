import type { Color, GameResult, Move, Position, Square } from '@xq/xiangqi-core';

export interface GameControllerState {
  readonly position: Position;
  readonly history: readonly Move[];
  readonly lastMove: Move | null;
  readonly selectedSquare: Square | null;
  readonly legalTargets: readonly Square[];
  readonly orientation: Color;
  readonly result: GameResult | null;
}

export interface GameController {
  getState(): GameControllerState;
  subscribe(listener: () => void): () => void;
  selectSquare(square: Square | null): void;
  submitMove(move: Move): boolean;
  flip(): void;
  resign?(color: Color): void;
  undo?(): void;
  offerDraw?(): void;
}
