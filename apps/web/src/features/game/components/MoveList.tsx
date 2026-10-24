'use client';

import { useEffect, useRef } from 'react';
import { encodeMove } from '@xq/xiangqi-core';
import type { Move } from '@xq/xiangqi-core';

export interface MoveListProps {
  readonly moves: readonly Move[];
  /** 1-based ply to highlight (ply 1 = first move). Defaults to the most recent move. */
  readonly currentPly?: number;
}

/** Numbered move pairs (`1. red black`), scrollable, scrolled to the latest move. */
export function MoveList({ moves, currentPly }: MoveListProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const highlightIndex = currentPly !== undefined ? currentPly - 1 : moves.length - 1;

  useEffect(() => {
    const node = listRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [moves.length]);

  const rows: number[] = [];
  for (let index = 0; index < moves.length; index += 2) rows.push(index);

  return (
    <div ref={listRef} aria-label="Danh sách nước đi" className="max-h-64 overflow-y-auto text-sm">
      {moves.length === 0 ? (
        <p className="text-muted-foreground">Chưa có nước đi</p>
      ) : (
        <ol className="flex flex-col gap-1">
          {rows.map((redIndex) => {
            const blackIndex = redIndex + 1;
            const red = moves[redIndex];
            const black = moves[blackIndex];
            return (
              <li key={redIndex} className="grid grid-cols-[2.5rem_1fr_1fr] gap-2 font-mono">
                <span className="text-muted-foreground">{`${redIndex / 2 + 1}.`}</span>{' '}
                {red && <MoveCell index={redIndex} move={red} highlighted={redIndex === highlightIndex} />}{' '}
                {black ? (
                  <MoveCell index={blackIndex} move={black} highlighted={blackIndex === highlightIndex} />
                ) : (
                  <span />
                )}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

function MoveCell({ index, move, highlighted }: { index: number; move: Move; highlighted: boolean }) {
  return (
    <span
      data-ply={index + 1}
      aria-current={highlighted ? 'step' : undefined}
      className={highlighted ? 'rounded bg-amber-200 px-1 font-semibold' : 'px-1'}
    >
      {encodeMove(move)}
    </span>
  );
}
