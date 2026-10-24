import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { loadLessons, loadPuzzles, lessonSchema, puzzleSchema, validateLesson, validatePuzzle } from './index.js';

const fixtureRoot = join(dirname(fileURLToPath(import.meta.url)), '__fixtures__');
const readFixture = (type: 'lessons' | 'puzzles', name: string): unknown =>
  JSON.parse(readFileSync(join(fixtureRoot, 'valid', type, `${name}.json`), 'utf8')) as unknown;

describe('content schemas and loader', () => {
  it('loads and validates the fixture lesson and puzzle', () => {
    expect(loadLessons(join(fixtureRoot, 'valid'))).toHaveLength(1);
    expect(loadPuzzles(join(fixtureRoot, 'valid'))).toHaveLength(1);
  });

  it('rejects puzzle hint and difficulty boundary violations', () => {
    const puzzle = readFixture('puzzles', 'fixture-puzzle') as Record<string, unknown>;
    expect(puzzleSchema.safeParse({ ...puzzle, hints: ['1', '2', '3', '4'] }).success).toBe(false);
    expect(puzzleSchema.safeParse({ ...puzzle, difficulty: 6 }).success).toBe(false);
  });

  it('rejects malformed lesson fields', () => {
    const lesson = readFixture('lessons', 'fixture-lesson') as Record<string, unknown>;
    expect(lessonSchema.safeParse({ ...lesson, level: 'expert' }).success).toBe(false);
  });
});

describe('content validation', () => {
  it('accepts a fixture puzzle with a legal alternating line', () => {
    expect(() => validatePuzzle(puzzleSchema.parse(readFixture('puzzles', 'fixture-puzzle')), 'fixture-puzzle.json')).not.toThrow();
  });

  it('rejects an illegal move with filename, line, and ply details', () => {
    const puzzle = puzzleSchema.parse({ ...(readFixture('puzzles', 'fixture-puzzle') as Record<string, unknown>), solutionLines: [['a3a9']] });
    expect(() => validatePuzzle(puzzle, 'illegal-fixture.json')).toThrow(/illegal-fixture\.json: solutionLines\[1\] ply 1/);
  });

  it('accepts a lesson with valid step FEN', () => {
    expect(() => validateLesson(lessonSchema.parse(readFixture('lessons', 'fixture-lesson')), 'fixture-lesson.json')).not.toThrow();
  });

  it('rejects an invalid lesson FEN with step details', () => {
    const lesson = lessonSchema.parse({ ...(readFixture('lessons', 'fixture-lesson') as Record<string, unknown>), steps: [{ fen: 'bad', caption: 'bad' }] });
    expect(() => validateLesson(lesson, 'bad-lesson.json')).toThrow(/bad-lesson\.json: steps\[1\] has invalid FEN/);
  });
});
