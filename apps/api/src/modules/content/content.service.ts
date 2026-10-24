import { Injectable, NotFoundException } from '@nestjs/common';
import {
  lessonDetailSchema,
  lessonSummarySchema,
  puzzleDetailSchema,
  puzzleSummarySchema,
} from '@xq/shared-contracts';
import type {
  LessonDetail,
  LessonSummary,
  PuzzleDetail,
  PuzzleSummary,
  RecordPuzzleAttemptRequest,
  RecordPuzzleAttemptResponse,
} from '@xq/shared-contracts';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class ContentService {
  constructor(private readonly prisma: PrismaService) {}

  async getLessons(): Promise<LessonSummary[]> {
    const rows = await this.prisma.lesson.findMany({ orderBy: { slug: 'asc' } });
    return rows.map((row) => lessonSummarySchema.parse({
      slug: row.slug,
      title: row.title,
      level: row.level.toLowerCase(),
    }));
  }

  async getLesson(slug: string): Promise<LessonDetail> {
    const row = await this.prisma.lesson.findUnique({ where: { slug } });
    if (!row) throw new NotFoundException('LESSON_NOT_FOUND');
    return lessonDetailSchema.parse({
      slug: row.slug,
      title: row.title,
      level: row.level.toLowerCase(),
      steps: row.bodyJson,
    });
  }

  async getPuzzles(): Promise<PuzzleSummary[]> {
    const rows = await this.prisma.puzzle.findMany({ orderBy: { id: 'asc' } });
    return rows.map((row) => puzzleSummarySchema.parse({
      id: row.id,
      title: row.title,
      difficulty: row.difficulty,
    }));
  }

  async getPuzzle(id: string): Promise<PuzzleDetail> {
    const row = await this.prisma.puzzle.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('PUZZLE_NOT_FOUND');
    return puzzleDetailSchema.parse({
      id: row.id,
      title: row.title,
      difficulty: row.difficulty,
      objective: row.objective,
      initialFen: row.initialFen,
      sideToMove: row.sideToMove.toLowerCase(),
      solutionLines: row.solutionJson,
      allowedAlternatives: row.allowedAlternatives,
      hints: row.hints,
      source: row.source,
    });
  }

  async recordPuzzleAttempt(
    id: string,
    userId: string,
    body: RecordPuzzleAttemptRequest,
  ): Promise<RecordPuzzleAttemptResponse> {
    if (!await this.prisma.puzzle.findUnique({ where: { id }, select: { id: true } })) {
      throw new NotFoundException('PUZZLE_NOT_FOUND');
    }

    const key = { userId_contentType_contentId: { userId, contentType: 'PUZZLE' as const, contentId: id } };
    const row = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.learningProgress.findUnique({ where: key });
      if (!existing) {
        return tx.learningProgress.create({
          data: {
            userId,
            contentType: 'PUZZLE',
            contentId: id,
            status: body.completed ? 'COMPLETED' : 'IN_PROGRESS',
            attempts: 1,
            ...(body.completed ? { completedAt: new Date() } : {}),
          },
        });
      }

      const completed = existing.status === 'COMPLETED' || body.completed;
      return tx.learningProgress.update({
        where: { id: existing.id },
        data: {
          attempts: { increment: 1 },
          status: completed ? 'COMPLETED' : 'IN_PROGRESS',
          ...(body.completed && existing.status !== 'COMPLETED' ? { completedAt: new Date() } : {}),
        },
      });
    });
    return {
      status: row.status === 'COMPLETED' ? 'completed' : 'in_progress',
      attempts: row.attempts,
    };
  }
}
