'use client';

import { useRef, useState } from 'react';
import type { PointerEvent, KeyboardEvent } from 'react';
import type { Color, Move, Piece, Position, Square } from '@xq/xiangqi-core';

export interface Board2DProps {
  readonly position: Position;
  readonly orientation: Color;
  readonly selectedSquare: Square | null;
  readonly legalTargets: readonly Square[];
  readonly lastMove: Move | null;
  readonly interactive: boolean;
  readonly onSquareClick: (square: Square) => void;
  readonly onMove: (move: Move) => void;
}

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'] as const;
const GRID = 64;
const MARGIN = 48;
const WIDTH = MARGIN * 2 + GRID * 8;
const HEIGHT = MARGIN * 2 + GRID * 9;
const PIECE_RADIUS = 24;

const PIECE_LABELS: Record<Piece['type'], string> = {
  GENERAL: 'General',
  ADVISOR: 'Advisor',
  ELEPHANT: 'Elephant',
  HORSE: 'Horse',
  CHARIOT: 'Chariot',
  CANNON: 'Cannon',
  SOLDIER: 'Soldier',
};

export const PIECE_GLYPHS: Record<Color, Record<Piece['type'], string>> = {
  red: {
    GENERAL: '帥', ADVISOR: '仕', ELEPHANT: '相', HORSE: '馬',
    CHARIOT: '車', CANNON: '炮', SOLDIER: '兵',
  },
  black: {
    GENERAL: '將', ADVISOR: '士', ELEPHANT: '象', HORSE: '馬',
    CHARIOT: '車', CANNON: '砲', SOLDIER: '卒',
  },
};

interface DragState {
  readonly from: Square;
  readonly startX: number;
  readonly startY: number;
  readonly piece: Piece;
  moved: boolean;
  pointerX: number;
  pointerY: number;
}

function toSquare(file: number, rank: number): Square {
  return `${FILES[file]}${rank}` as Square;
}

function squareCoordinates(square: Square, orientation: Color): { x: number; y: number; file: number; rank: number } {
  const file = square.charCodeAt(0) - 97;
  const rank = Number(square.slice(1));
  const visualRow = orientation === 'red' ? 9 - rank : rank;
  return { x: MARGIN + file * GRID, y: MARGIN + visualRow * GRID, file, rank };
}

export function Board2D({
  position,
  orientation,
  selectedSquare,
  legalTargets,
  lastMove,
  interactive,
  onSquareClick,
  onMove,
}: Board2DProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const [cursorSquare, setCursorSquare] = useState<Square>('e4' as Square);
  const [dragVisual, setDragVisual] = useState<{ piece: Piece; x: number; y: number } | null>(null);
  const legalTargetSet = new Set<Square>(legalTargets);
  const lastMoveSquares = new Set<Square>(lastMove ? [lastMove.from, lastMove.to] : []);

  const pieceAt = (file: number, rank: number): Piece | null => position.board[rank * 9 + file] ?? null;

  const pointInSvg = (clientX: number, clientY: number): { x: number; y: number } => {
    const bounds = svgRef.current?.getBoundingClientRect();
    if (!bounds || bounds.width === 0 || bounds.height === 0) return { x: 0, y: 0 };
    return {
      x: ((clientX - bounds.left) / bounds.width) * WIDTH,
      y: ((clientY - bounds.top) / bounds.height) * HEIGHT,
    };
  };

  const handlePointerDown = (event: PointerEvent<SVGGElement>, square: Square, piece: Piece | null): void => {
    if (!interactive) return;
    if (piece) {
      dragRef.current = {
        from: square,
        startX: event.clientX,
        startY: event.clientY,
        piece,
        moved: false,
        pointerX: event.clientX,
        pointerY: event.clientY,
      };
    }
  };

  const handlePointerMove = (event: PointerEvent<SVGSVGElement>): void => {
    const drag = dragRef.current;
    if (!interactive || !drag) return;
    drag.pointerX = event.clientX;
    drag.pointerY = event.clientY;
    if (Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) >= 5) drag.moved = true;
    if (drag.moved) {
      const point = pointInSvg(event.clientX, event.clientY);
      setDragVisual({ piece: drag.piece, ...point });
    }
  };

  const handlePointerUp = (event: PointerEvent<SVGSVGElement>): void => {
    if (!interactive) return;
    const drag = dragRef.current;
    const squareElement = (event.target as Element).closest<SVGGElement>('[data-square]');
    const to = squareElement?.dataset.square as Square | undefined;
    dragRef.current = null;
    setDragVisual(null);

    if (!drag) {
      if (to) onSquareClick(to);
      return;
    }

    const movedDistance = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY);
    const isDrag = drag.moved || movedDistance >= 5 || (to !== undefined && to !== drag.from);
    if (isDrag) {
      if (to && legalTargetSet.has(to)) onMove({ from: drag.from, to });
      return;
    }
    if (to) onSquareClick(to);
  };

  const handleKeyDown = (event: KeyboardEvent<SVGSVGElement>): void => {
    if (!interactive) return;
    const file = cursorSquare.charCodeAt(0) - 97;
    const rank = Number(cursorSquare.slice(1));
    let nextFile = file;
    let nextRank = rank;
    switch (event.key) {
      case 'ArrowLeft': nextFile = Math.max(0, file - 1); break;
      case 'ArrowRight': nextFile = Math.min(8, file + 1); break;
      case 'ArrowUp': nextRank = Math.min(9, rank + (orientation === 'red' ? 1 : -1)); break;
      case 'ArrowDown': nextRank = Math.max(0, rank + (orientation === 'red' ? -1 : 1)); break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        onSquareClick(cursorSquare);
        return;
      default: return;
    }
    event.preventDefault();
    setCursorSquare(toSquare(nextFile, nextRank));
  };

  const rowNodes = [];
  for (let visualRow = 0; visualRow < 10; visualRow += 1) {
    const rank = orientation === 'red' ? 9 - visualRow : visualRow;
    const squareNodes = [];
    for (let file = 0; file < 9; file += 1) {
      const square = toSquare(file, rank);
      const piece = pieceAt(file, rank);
      const { x, y } = squareCoordinates(square, orientation);
      const isSelected = selectedSquare === square;
      const isLastMove = lastMoveSquares.has(square);
      const isLegalTarget = legalTargetSet.has(square);
      const label = piece
        ? `${square}, ${piece.color === 'red' ? 'Red' : 'Black'} ${PIECE_LABELS[piece.type]}`
        : `${square}, empty`;

      squareNodes.push(
        <g
          key={square}
          role="gridcell"
          aria-label={label}
          data-square={square}
          onPointerDown={interactive ? (event) => handlePointerDown(event, square, piece) : undefined}
          style={interactive ? { cursor: piece ? 'grab' : 'pointer', touchAction: 'none' } : undefined}
        >
          <circle cx={x} cy={y} r={GRID / 2 - 2} fill="transparent" />
          {isLastMove && <circle data-state="last-move" cx={x} cy={y} r={GRID / 2 - 5} fill="#eab308" fillOpacity="0.22" />}
          {isSelected && <circle data-state="selected" cx={x} cy={y} r={PIECE_RADIUS + 7} fill="#60a5fa" fillOpacity="0.32" stroke="#2563eb" strokeWidth="3" />}
          {isLegalTarget && !piece && <circle data-state="legal-target" cx={x} cy={y} r="7" fill="#166534" fillOpacity="0.75" />}
          {isLegalTarget && piece && <circle data-state="legal-target-capture" cx={x} cy={y} r={PIECE_RADIUS + 5} fill="none" stroke="#dc2626" strokeWidth="4" />}
          {piece && square !== dragRef.current?.from && (
            <>
              <circle
                cx={x}
                cy={y}
                r={PIECE_RADIUS}
                fill={piece.color === 'red' ? '#fff4e8' : '#f3f4f6'}
                stroke={piece.color === 'red' ? '#b42318' : '#262626'}
                strokeWidth={piece.color === 'red' ? 3.5 : 2.5}
              />
              {piece.color === 'black' && <circle cx={x} cy={y} r={PIECE_RADIUS - 4} fill="none" stroke="#262626" strokeWidth="1.2" />}
              <text
                x={x}
                y={y + 1}
                textAnchor="middle"
                dominantBaseline="central"
                fill={piece.color === 'red' ? '#b42318' : '#171717'}
                fontSize="25"
                fontWeight="700"
                fontFamily="serif"
                aria-hidden="true"
              >
                {PIECE_GLYPHS[piece.color][piece.type]}
              </text>
            </>
          )}
        </g>,
      );
    }
    rowNodes.push(<g key={`row-${visualRow}`} role="row">{squareNodes}</g>);
  }

  const dragPoint = dragVisual;

  return (
    <svg
      ref={svgRef}
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      width="100%"
      height="100%"
      role="grid"
      aria-label="Xiangqi board"
      tabIndex={interactive ? 0 : -1}
      onKeyDown={interactive ? handleKeyDown : undefined}
      onPointerMove={interactive ? handlePointerMove : undefined}
      onPointerUp={interactive ? handlePointerUp : undefined}
      style={{ display: 'block', minWidth: interactive ? 448 : undefined, overflow: 'visible', userSelect: 'none', outlineOffset: 4 }}
    >
      <rect x="0" y="0" width={WIDTH} height={HEIGHT} fill="#e8c991" />
      <rect x={MARGIN - 4} y={MARGIN + GRID * 4 + GRID / 2 - 10} width={GRID * 8 + 8} height="20" fill="#f0d9ad" />
      {Array.from({ length: 10 }, (_, visualRow) => {
        const y = MARGIN + visualRow * GRID;
        return <line key={`rank-${visualRow}`} x1={MARGIN} y1={y} x2={WIDTH - MARGIN} y2={y} stroke="#553a20" strokeWidth="2" />;
      })}
      {Array.from({ length: 9 }, (_, file) => {
        const x = MARGIN + file * GRID;
        const y4 = MARGIN + 4 * GRID;
        const y5 = MARGIN + 5 * GRID;
        return <g key={`file-${file}`}>
          <line x1={x} y1={MARGIN} x2={x} y2={y4} stroke="#553a20" strokeWidth="2" />
          <line x1={x} y1={y5} x2={x} y2={HEIGHT - MARGIN} stroke="#553a20" strokeWidth="2" />
        </g>;
      })}
      <line x1={MARGIN + 3 * GRID} y1={MARGIN} x2={MARGIN + 5 * GRID} y2={MARGIN + 2 * GRID} stroke="#553a20" strokeWidth="2" />
      <line x1={MARGIN + 5 * GRID} y1={MARGIN} x2={MARGIN + 3 * GRID} y2={MARGIN + 2 * GRID} stroke="#553a20" strokeWidth="2" />
      <line x1={MARGIN + 3 * GRID} y1={MARGIN + 7 * GRID} x2={MARGIN + 5 * GRID} y2={MARGIN + 9 * GRID} stroke="#553a20" strokeWidth="2" />
      <line x1={MARGIN + 5 * GRID} y1={MARGIN + 7 * GRID} x2={MARGIN + 3 * GRID} y2={MARGIN + 9 * GRID} stroke="#553a20" strokeWidth="2" />
      {rowNodes}
      {dragVisual && dragPoint && (
        <g pointerEvents="none" opacity="0.9">
          <circle cx={dragPoint.x} cy={dragPoint.y} r={PIECE_RADIUS} fill={dragVisual.piece.color === 'red' ? '#fff4e8' : '#f3f4f6'} stroke={dragVisual.piece.color === 'red' ? '#b42318' : '#262626'} strokeWidth="3" />
          <text x={dragPoint.x} y={dragPoint.y + 1} textAnchor="middle" dominantBaseline="central" fill={dragVisual.piece.color === 'red' ? '#b42318' : '#171717'} fontSize="25" fontWeight="700" fontFamily="serif">{PIECE_GLYPHS[dragVisual.piece.color][dragVisual.piece.type]}</text>
        </g>
      )}
    </svg>
  );
}
