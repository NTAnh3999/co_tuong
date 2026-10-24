import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadLessons, loadPuzzles } from './loader.js';
import { validateContent } from './validate-content.js';

const requireFromApi = createRequire(resolve(process.cwd(), '../../apps/api/package.json'));
const { PrismaClient } = requireFromApi('@prisma/client') as { PrismaClient: new () => ContentPrismaClient };

interface ContentPrismaClient {
  lesson: {
    upsert(args: { where: { slug: string }; create: Record<string, unknown>; update: Record<string, unknown> }): Promise<unknown>;
  };
  puzzle: {
    upsert(args: { where: { id: string }; create: Record<string, unknown>; update: Record<string, unknown> }): Promise<unknown>;
  };
  $disconnect(): Promise<void>;
}

const lessons = loadLessons();
const puzzles = loadPuzzles();
validateContent(lessons, puzzles);
const prisma = new PrismaClient();

try {
  for (const lesson of lessons) {
    const { steps, ...fields } = lesson;
    await prisma.lesson.upsert({
      where: { slug: lesson.slug },
      create: { ...fields, level: lesson.level.toUpperCase(), bodyJson: steps },
      update: { ...fields, level: lesson.level.toUpperCase(), bodyJson: steps },
    });
  }
  for (const puzzle of puzzles) {
    const { solutionLines, ...fields } = puzzle;
    await prisma.puzzle.upsert({
      where: { id: puzzle.id },
      create: { ...fields, sideToMove: puzzle.sideToMove.toUpperCase(), solutionJson: solutionLines },
      update: { ...fields, sideToMove: puzzle.sideToMove.toUpperCase(), solutionJson: solutionLines },
    });
  }
  console.log(`Seeded ${lessons.length} lessons and ${puzzles.length} puzzles.`);
} finally {
  await prisma.$disconnect();
}
