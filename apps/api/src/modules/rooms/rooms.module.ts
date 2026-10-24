import { Module } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { GamesService } from '../games/games.service.js';
import { SessionGuard } from '../sessions/session.guard.js';
import { SessionsService } from '../sessions/sessions.service.js';
import { RoomsController } from './rooms.controller.js';
import { RoomsService } from './rooms.service.js';

@Module({
  imports: [PrismaModule, ThrottlerModule.forRoot([{ ttl: 60_000, limit: 10 }])],
  controllers: [RoomsController],
  providers: [RoomsService, GamesService, SessionsService, SessionGuard, ThrottlerGuard],
  exports: [RoomsService],
})
export class RoomsModule {}
