import { BadRequestException, Controller, ForbiddenException, Get, Param, Post, Query, UseGuards, Body } from '@nestjs/common';
import { drawOfferRequestSchema } from '@xq/shared-contracts';
import type { Color } from '@xq/xiangqi-core';
import type { UserSummary } from '@xq/shared-contracts';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { CurrentUser } from '../sessions/current-user.decorator.js';
import { SessionGuard } from '../sessions/session.guard.js';
import { GamesService } from './games.service.js';

@Controller()
@UseGuards(SessionGuard)
export class GamesController {
  constructor(private readonly games: GamesService) {}

  @Get('games/:id')
  getGame(@Param('id') id: string) {
    return this.games.getSnapshot(id);
  }

  @Get('games/:id/moves')
  getMoves(
    @Param('id') id: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedCursor = cursor === undefined ? -1 : Number(cursor);
    const parsedLimit = limit === undefined ? 50 : Number(limit);
    if (!Number.isSafeInteger(parsedCursor) || parsedCursor < -1 || (cursor !== undefined && !/^\d+$/.test(cursor))) {
      throw new BadRequestException('INVALID_CURSOR');
    }
    if (!Number.isSafeInteger(parsedLimit) || parsedLimit < 1) throw new BadRequestException('INVALID_LIMIT');
    return this.games.getMoves(id, parsedCursor, Math.min(parsedLimit, 200));
  }

  @Post('games/:id/resign')
  async resign(@Param('id') id: string, @CurrentUser() user: UserSummary) {
    const color = await this.playerColor(id, user.id);
    return this.games.resign(id, color);
  }

  @Post('games/:id/draw-offer')
  async drawOffer(
    @Param('id') id: string,
    @CurrentUser() user: UserSummary,
    @Body(new ZodValidationPipe(drawOfferRequestSchema)) body: { action: 'offer' | 'accept' | 'decline' },
  ) {
    const color = await this.playerColor(id, user.id);
    return this.games.drawOffer(id, color, body.action);
  }

  @Get('me/games')
  getMyGames(@CurrentUser() user: UserSummary) {
    return this.games.listForUser(user.id);
  }

  private async playerColor(gameId: string, userId: string): Promise<Color> {
    const players = await this.games.getPlayers(gameId);
    if (players.redId === userId) return 'red';
    if (players.blackId === userId) return 'black';
    throw new ForbiddenException('NOT_A_PLAYER');
  }
}
