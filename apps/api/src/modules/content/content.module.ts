import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { SessionsModule } from '../sessions/sessions.module.js';
import { ContentController } from './content.controller.js';
import { ContentService } from './content.service.js';

@Module({
  imports: [PrismaModule, SessionsModule],
  controllers: [ContentController],
  providers: [ContentService],
})
export class ContentModule {}
