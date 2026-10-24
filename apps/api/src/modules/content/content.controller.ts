import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import type { UserSummary } from '@xq/shared-contracts';
import {
  recordPuzzleAttemptRequestSchema,
} from '@xq/shared-contracts';
import type {
  LessonDetail,
  LessonSummary,
  PuzzleDetail,
  PuzzleSummary,
  RecordPuzzleAttemptRequest,
  RecordPuzzleAttemptResponse,
} from '@xq/shared-contracts';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { CurrentUser } from '../sessions/current-user.decorator.js';
import { SessionGuard } from '../sessions/session.guard.js';
import { ContentService } from './content.service.js';

@Controller()
@UseGuards(SessionGuard)
export class ContentController {
  constructor(private readonly content: ContentService) {}

  @Get('lessons')
  getLessons(): Promise<LessonSummary[]> {
    return this.content.getLessons();
  }

  @Get('lessons/:slug')
  getLesson(@Param('slug') slug: string): Promise<LessonDetail> {
    return this.content.getLesson(slug);
  }

  @Get('puzzles')
  getPuzzles(): Promise<PuzzleSummary[]> {
    return this.content.getPuzzles();
  }

  @Get('puzzles/:id')
  getPuzzle(@Param('id') id: string): Promise<PuzzleDetail> {
    return this.content.getPuzzle(id);
  }

  @Post('puzzles/:id/attempts')
  recordAttempt(
    @Param('id') id: string,
    @CurrentUser() user: UserSummary,
    @Body(new ZodValidationPipe(recordPuzzleAttemptRequestSchema)) body: RecordPuzzleAttemptRequest,
  ): Promise<RecordPuzzleAttemptResponse> {
    return this.content.recordPuzzleAttempt(id, user.id, body);
  }
}
