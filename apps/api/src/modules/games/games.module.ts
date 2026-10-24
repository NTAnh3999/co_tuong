import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { SessionsModule } from '../sessions/sessions.module.js';
import { GamesController } from './games.controller.js';
import { GamesService } from './games.service.js';
import { ClockScheduler } from './clock-scheduler.service.js';

@Module({
  imports: [PrismaModule, SessionsModule, EventEmitterModule.forRoot({ global: true })],
  controllers: [GamesController],
  providers: [GamesService, ClockScheduler],
  exports: [GamesService],
})
export class GamesModule {}
