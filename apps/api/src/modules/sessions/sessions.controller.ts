import { Body, Controller, Get, Patch, Post, Res, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type { CreateGuestRequest, UserSummary } from '@xq/shared-contracts';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { createGuestRequestSchema, updateMeRequestSchema } from '@xq/shared-contracts';
import { CurrentUser } from './current-user.decorator';
import { SESSION_COOKIE_NAME, SESSION_TTL_MS } from './session-identity';
import { SessionGuard } from './session.guard';
import { SessionsService } from './sessions.service';

interface CookieResponse {
  cookie(name: string, value: string, options: {
    httpOnly: boolean;
    secure: boolean;
    sameSite: 'lax';
    maxAge: number;
    path: string;
  }): void;
}

@Controller()
export class SessionsController {
  constructor(private readonly sessions: SessionsService) {}

  @Post('sessions/guest')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async createGuest(
    @Body(new ZodValidationPipe(createGuestRequestSchema)) body: CreateGuestRequest,
    @Res({ passthrough: true }) response: CookieResponse,
  ): Promise<UserSummary> {
    const created = await this.sessions.createGuest(body);
    response.cookie(SESSION_COOKIE_NAME, created.rawToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_TTL_MS,
      path: '/',
    });
    return created.user;
  }

  @Get('me')
  @UseGuards(SessionGuard)
  getMe(@CurrentUser() user: UserSummary): UserSummary {
    return user;
  }

  @Patch('me')
  @UseGuards(SessionGuard)
  updateMe(
    @CurrentUser() user: UserSummary,
    @Body(new ZodValidationPipe(updateMeRequestSchema)) body: { nickname: string },
  ): Promise<UserSummary> {
    return this.sessions.updateNickname(user.id, body.nickname);
  }
}
