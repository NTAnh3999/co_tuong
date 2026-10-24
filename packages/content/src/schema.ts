import { z } from 'zod';

export const puzzleSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  objective: z.string(),
  difficulty: z.number().int().min(1).max(5),
  initialFen: z.string(),
  sideToMove: z.enum(['red', 'black']),
  solutionLines: z.array(z.array(z.string()).min(1)).min(1),
  allowedAlternatives: z.array(z.array(z.string()).min(1)).default([]),
  hints: z.array(z.string()).max(3),
  source: z.string(),
  contentVersion: z.number().int().default(1),
});

export const lessonSchema = z.object({
  slug: z.string().min(1),
  title: z.string(),
  level: z.enum(['beginner', 'intermediate', 'advanced']),
  contentVersion: z.number().int().default(1),
  steps: z.array(z.object({
    fen: z.string(),
    caption: z.string(),
    highlightSquares: z.array(z.string()).default([]),
  })).min(1),
});

export type Puzzle = z.infer<typeof puzzleSchema>;
export type Lesson = z.infer<typeof lessonSchema>;
