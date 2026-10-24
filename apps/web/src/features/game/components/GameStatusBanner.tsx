'use client';

import type { Color, GameResult } from '@xq/xiangqi-core';
import { resultText, turnText } from './result-text';

export interface GameStatusBannerProps {
  readonly turn: Color;
  /** Null while the game is ongoing. */
  readonly result: GameResult | null;
  /** Accepted for future perspective-specific copy; the current copy is orientation-independent. */
  readonly orientation: Color;
}

export function GameStatusBanner({ turn, result }: GameStatusBannerProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      data-state={result ? 'finished' : 'ongoing'}
      className="text-center text-base font-semibold"
    >
      {result ? resultText(result) : turnText(turn)}
    </div>
  );
}
