import { describe, expect, it } from 'vitest';
import { createInitialPosition } from './position.js';

describe('createInitialPosition', () => {
  it('CORE-01: has the standard 32-piece setup and counts', () => {
    const position = createInitialPosition();
    expect(position.board).toHaveLength(90);
    expect(position.turn).toBe('red');
    for (const color of ['red', 'black'] as const) {
      const pieces = position.board.flatMap((piece) => piece?.color === color ? [piece] : []);
      expect(pieces).toHaveLength(16);
      expect(pieces.filter((piece) => piece.type === 'GENERAL')).toHaveLength(1);
      for (const type of ['ADVISOR', 'ELEPHANT', 'HORSE', 'CHARIOT', 'CANNON'] as const) {
        expect(pieces.filter((piece) => piece.type === type)).toHaveLength(2);
      }
      expect(pieces.filter((piece) => piece.type === 'SOLDIER')).toHaveLength(5);
    }
    expect(position.board.filter(Boolean)).toHaveLength(32);
  });
});
