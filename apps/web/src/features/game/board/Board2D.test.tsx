import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createInitialPosition } from '@xq/xiangqi-core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Board2D } from './Board2D';
import type { Board2DProps } from './Board2D';
import type { Position, Square } from '@xq/xiangqi-core';

afterEach(cleanup);

function renderBoard(overrides: Partial<Board2DProps> = {}) {
  const onSquareClick = vi.fn();
  const onMove = vi.fn();
  const props: Board2DProps = {
    position: createInitialPosition(),
    orientation: 'red',
    selectedSquare: null,
    legalTargets: [],
    lastMove: null,
    interactive: true,
    onSquareClick,
    onMove,
    ...overrides,
  };
  return { ...render(<Board2D {...props} />), onSquareClick, onMove };
}

describe('Board2D', () => {
  it('WEB-01 renders all 32 starting pieces at their ADR-018 squares', () => {
    renderBoard();
    expect(screen.getAllByRole('gridcell').filter((square) => !square.getAttribute('aria-label')?.endsWith(', empty'))).toHaveLength(32);
    expect(screen.getByLabelText('a0, Red Chariot')).toHaveTextContent('車');
    expect(screen.getByLabelText('e0, Red General')).toHaveTextContent('帥');
    expect(screen.getByLabelText('b2, Red Cannon')).toHaveTextContent('炮');
    expect(screen.getByLabelText('a3, Red Soldier')).toHaveTextContent('兵');
    expect(screen.getByLabelText('a9, Black Chariot')).toHaveTextContent('車');
    expect(screen.getByLabelText('e9, Black General')).toHaveTextContent('將');
    expect(screen.getByLabelText('b7, Black Cannon')).toHaveTextContent('砲');
    expect(screen.getByLabelText('a6, Black Soldier')).toHaveTextContent('卒');
  });

  it('WEB-01 flips rank ordering for black while preserving file order', () => {
    const red = renderBoard({ orientation: 'red' });
    const redSquares = [...red.container.querySelectorAll('[data-square]')];
    expect(redSquares[0]).toHaveAttribute('data-square', 'a9');
    expect(redSquares[8]).toHaveAttribute('data-square', 'i9');
    red.unmount();

    const black = renderBoard({ orientation: 'black' });
    const blackSquares = [...black.container.querySelectorAll('[data-square]')];
    expect(blackSquares[0]).toHaveAttribute('data-square', 'a0');
    expect(blackSquares[8]).toHaveAttribute('data-square', 'i0');
  });

  it('WEB-01 treats a same-square pointer down and up as a tap', () => {
    const { onSquareClick, onMove } = renderBoard();
    const square = screen.getByRole('gridcell', { name: 'e4, empty' });
    fireEvent.pointerDown(square, { clientX: 100, clientY: 100 });
    fireEvent.pointerUp(square, { clientX: 100, clientY: 100 });
    expect(onSquareClick).toHaveBeenCalledWith('e4');
    expect(onMove).not.toHaveBeenCalled();
  });

  it('WEB-01 distinguishes legal quiet and capture targets from ordinary squares', () => {
    const position = createInitialPosition();
    renderBoard({ legalTargets: ['e4', 'a0'] as Square[], position });
    expect(screen.getByLabelText('e4, empty').querySelector('[data-state="legal-target"]')).toBeInTheDocument();
    expect(screen.getByLabelText('a0, Red Chariot').querySelector('[data-state="legal-target-capture"]')).toBeInTheDocument();
    expect(screen.getByLabelText('c4, empty').querySelector('[data-state^="legal-target"]')).toBeNull();
  });

  it('WEB-01 highlights the selected square', () => {
    renderBoard({ selectedSquare: 'c4' as Square });
    expect(screen.getByLabelText('c4, empty').querySelector('[data-state="selected"]')).toBeInTheDocument();
  });

  it('WEB-01 does not respond to pointer events when non-interactive', () => {
    const { onSquareClick, onMove } = renderBoard({ interactive: false });
    const square = screen.getByRole('gridcell', { name: 'e4, empty' });
    fireEvent.pointerDown(square, { clientX: 100, clientY: 100 });
    fireEvent.pointerUp(square, { clientX: 100, clientY: 100 });
    expect(onSquareClick).not.toHaveBeenCalled();
    expect(onMove).not.toHaveBeenCalled();
  });

  it('WEB-01 moves the keyboard cursor with arrows and activates it with Enter', () => {
    const { onSquareClick } = renderBoard();
    const board = screen.getByRole('grid', { name: 'Xiangqi board' });
    board.focus();
    fireEvent.keyDown(board, { key: 'ArrowRight' });
    fireEvent.keyDown(board, { key: 'Enter' });
    expect(onSquareClick).toHaveBeenCalledWith('f4');
  });

  it('WEB-01 keeps board squares labeled with the displayed piece and square', () => {
    const position: Position = createInitialPosition();
    renderBoard({ position });
    expect(screen.getByRole('gridcell', { name: 'e4, empty' })).toHaveAttribute('data-square', 'e4');
  });
});
