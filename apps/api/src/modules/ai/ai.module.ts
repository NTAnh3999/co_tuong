import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { GamesModule } from '../games/games.module.js';
import { SessionsModule } from '../sessions/sessions.module.js';
import { AiController } from './ai.controller.js';
import { AiService } from './ai.service.js';

@Module({
  imports: [PrismaModule, GamesModule, SessionsModule],
  controllers: [AiController],
  providers: [AiService],
})
export class AiModule {}
