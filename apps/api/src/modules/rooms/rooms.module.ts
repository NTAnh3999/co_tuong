import { Module } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { GamesModule } from '../games/games.module.js';
import { SessionGuard } from '../sessions/session.guard.js';
import { SessionsService } from '../sessions/sessions.service.js';
import { RoomsController } from './rooms.controller.js';
import { RoomsService } from './rooms.service.js';
import { GameGateway } from '../games/game.gateway.js';

@Module({
  imports: [PrismaModule, GamesModule, ThrottlerModule.forRoot([{ ttl: 60_000, limit: 10 }])],
  controllers: [RoomsController],
  providers: [RoomsService, SessionsService, SessionGuard, ThrottlerGuard, GameGateway],
  exports: [RoomsService],
})
export class RoomsModule {}
