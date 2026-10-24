import { fromFen, toFen } from '@xq/xiangqi-core';
import type { Square } from '@xq/xiangqi-core';
import { describe, expect, it } from 'vitest';
import { createPuzzleController } from './puzzle-controller';

const puzzle = {
  id: 'mate-in-one',
  title: 'Chiếu hết trong một nước',
  difficulty: 1,
  objective: 'Chiếu hết Đen.',
  initialFen: '4k4/4r4/9/2R6/4R4/9/9/9/9/4K4 w - - 0 1',
  sideToMove: 'red' as const,
  solutionLines: [['c6c9']],
  allowedAlternatives: [],
  hints: ['Đưa xe lên hàng cuối.', 'Dùng xe ở c6.', 'Đi tới c9.'],
  source: 'Bài kiểm chứng mate-in-1',
};
const square = (value: string) => value as Square;

describe('LEARN-01 PuzzleController', () => {
  it('accepts the verified key move and solves the puzzle', () => {
    const controller = createPuzzleController(puzzle);
    controller.selectSquare(square('c6'));
    expect(controller.getState().legalTargets).toContain('c9');
    controller.selectSquare(square('c9'));

    expect(controller.getState().status).toBe('solved');
    expect(controller.getState().history).toEqual([{ from: 'c6', to: 'c9' }]);
  });

  it('marks a different legal move wrong without changing the board or history', () => {
    const controller = createPuzzleController(puzzle);
    const initialPosition = controller.getState().position;
    controller.selectSquare(square('e5'));
    expect(controller.getState().legalTargets).toContain('e6');
    controller.selectSquare(square('e6'));

    expect(controller.getState().lastMoveWasWrong).toBe(true);
    expect(controller.getState().position).toBe(initialPosition);
    expect(controller.getState().history).toEqual([]);
    expect(controller.getState().selectedSquare).toBeNull();
  });

  it('increments hints up to the available count and retry clears all attempt state', () => {
    const controller = createPuzzleController(puzzle);
    controller.requestHint();
    controller.requestHint();
    controller.requestHint();
    controller.requestHint();
    controller.selectSquare(square('c6'));
    controller.selectSquare(square('c9'));

    expect(controller.getState().hintsRevealed).toBe(3);
    expect(controller.getState().status).toBe('solved');
    controller.retry();

    expect(controller.getState()).toMatchObject({
      position: fromFen(puzzle.initialFen),
      selectedSquare: null,
      legalTargets: [],
      history: [],
      status: 'in_progress',
      lastMoveWasWrong: false,
      hintsRevealed: 0,
    });
    expect(toFen(controller.getState().position)).toBe(puzzle.initialFen);
  });
});
