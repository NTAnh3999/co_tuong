import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { createAiGameRequestSchema } from '@xq/shared-contracts';
import type { CreateAiGameRequest, UserSummary } from '@xq/shared-contracts';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { CurrentUser } from '../sessions/current-user.decorator.js';
import { SessionGuard } from '../sessions/session.guard.js';
import { AiService } from './ai.service.js';

@Controller()
@UseGuards(SessionGuard)
export class AiController {
  constructor(private readonly ai: AiService) {}

  @Post('games/ai')
  createAiGame(
    @CurrentUser() user: UserSummary,
    @Body(new ZodValidationPipe(createAiGameRequestSchema)) body: CreateAiGameRequest,
  ): Promise<{ gameId: string }> {
    return this.ai.createAiGame(user.id, body.color, body.difficulty);
  }
}
