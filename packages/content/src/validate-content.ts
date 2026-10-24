import { applyMove, decodeMove, fromFen, isLegalMove } from '@xq/xiangqi-core';
import type { Position } from '@xq/xiangqi-core';
import type { Lesson, Puzzle } from './schema.js';

export function validatePuzzle(puzzle: Puzzle, filename = puzzle.id): void {
  let initialPosition: Position;
  try {
    initialPosition = fromFen(puzzle.initialFen);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`${filename}: initialFen is invalid: ${detail}`, { cause: error });
  }
  if (initialPosition.turn !== puzzle.sideToMove) {
    throw new Error(`${filename}: sideToMove is ${puzzle.sideToMove}, but initialFen has ${initialPosition.turn} to move`);
  }

  const lines = [
    ...puzzle.solutionLines.map((moves) => ({ kind: 'solutionLines', moves })),
    ...puzzle.allowedAlternatives.map((moves) => ({ kind: 'allowedAlternatives', moves })),
  ];
  lines.forEach(({ kind, moves }, lineIndex) => {
    let position = initialPosition;
    moves.forEach((uci, plyIndex) => {
      const label = `${filename}: ${kind}[${lineIndex + 1}] ply ${plyIndex + 1} (${uci})`;
      try {
        if (!/^[a-i][0-9][a-i][0-9]$/.test(uci)) throw new Error('move must be a 4-character UCI string');
        const move = decodeMove(uci);
        const expectedTurn = plyIndex % 2 === 0 ? puzzle.sideToMove : puzzle.sideToMove === 'red' ? 'black' : 'red';
        if (position.turn !== expectedTurn) throw new Error(`expected ${expectedTurn} to move, position has ${position.turn}`);
        if (!isLegalMove(position, move)) throw new Error('move is illegal in this position');
        position = applyMove(position, move);
        if (position.turn === expectedTurn) throw new Error('position.turn did not alternate after the move');
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        throw new Error(`${label}: ${detail}`, { cause: error });
      }
    });
  });
}

export function validateLesson(lesson: Lesson, filename = lesson.slug): void {
  lesson.steps.forEach((step, index) => {
    try {
      fromFen(step.fen);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      throw new Error(`${filename}: steps[${index + 1}] has invalid FEN: ${detail}`, { cause: error });
    }
  });
}

export function validateContent(lessons: Lesson[], puzzles: Puzzle[]): void {
  for (const lesson of lessons) validateLesson(lesson);
  for (const puzzle of puzzles) validatePuzzle(puzzle);
}
