import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { lessonSchema, puzzleSchema } from './schema.js';
import type { Lesson, Puzzle } from './schema.js';

const sourceDirectory = dirname(fileURLToPath(import.meta.url));
const defaultDataDirectory = resolve(sourceDirectory, '../data');

function loadDirectory<T>(directory: string, parse: (value: unknown) => T): T[] {
  return readdirSync(directory)
    .filter((filename) => filename.endsWith('.json'))
    .sort()
    .map((filename) => {
      const fullPath = join(directory, filename);
      try {
        return parse(JSON.parse(readFileSync(fullPath, 'utf8')) as unknown);
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        throw new Error(`${filename}: ${detail}`, { cause: error });
      }
    });
}

export function loadLessons(dataDirectory = defaultDataDirectory): Lesson[] {
  return loadDirectory(join(dataDirectory, 'lessons'), (value) => lessonSchema.parse(value));
}

export function loadPuzzles(dataDirectory = defaultDataDirectory): Puzzle[] {
  return loadDirectory(join(dataDirectory, 'puzzles'), (value) => puzzleSchema.parse(value));
}
