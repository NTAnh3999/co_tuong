'use client';

import type { Color, Piece } from '@xq/xiangqi-core';
import { PIECE_GLYPHS } from '../board/Board2D';
import { colorName } from './result-text';

export interface CapturedPiecesProps {
  /** Pieces captured so far, in capture order. */
  readonly captured: readonly Piece[];
  /** Show only the captured pieces OF this color (i.e. what this side has lost). */
  readonly color: Color;
}

export function CapturedPieces({ captured, color }: CapturedPiecesProps) {
  const lost = captured.filter((piece) => piece.color === color);
  const label = `${colorName(color)} bị ăn`;

  if (lost.length === 0) {
    return (
      <div aria-label={label} className="text-xs text-muted-foreground">
        Chưa có quân nào bị ăn
      </div>
    );
  }

  return (
    <div role="list" aria-label={label} className="flex flex-wrap gap-1 font-serif text-lg">
      {lost.map((piece, index) => (
        <span
          key={`${piece.type}-${index}`}
          role="listitem"
          className={piece.color === 'red' ? 'text-red-700' : 'text-neutral-900'}
        >
          {PIECE_GLYPHS[piece.color][piece.type]}
        </span>
      ))}
    </div>
  );
}
