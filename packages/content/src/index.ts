export { lessonSchema, puzzleSchema } from './schema.js';
export type { Lesson, Puzzle } from './schema.js';
export { loadLessons, loadPuzzles } from './loader.js';
export { validateContent, validateLesson, validatePuzzle } from './validate-content.js';
export { isExactMateInN, solveMateInN } from './mate-solver.js';
export type { SolveMateResult } from './mate-solver.js';
