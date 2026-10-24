import { loadLessons, loadPuzzles } from './loader.js';
import { validateContent } from './validate-content.js';

try {
  const lessons = loadLessons();
  const puzzles = loadPuzzles();
  validateContent(lessons, puzzles);
  console.log(`Validated ${lessons.length} lessons and ${puzzles.length} puzzles.`);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
