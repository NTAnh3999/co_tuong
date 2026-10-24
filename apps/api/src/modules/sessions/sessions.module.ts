import { Module } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { SessionsController } from './sessions.controller';
import { SessionGuard } from './session.guard';
import { SessionsService } from './sessions.service';

@Module({
  imports: [ThrottlerModule.forRoot([{ ttl: 60_000, limit: 10 }])],
  controllers: [SessionsController],
  providers: [SessionsService, SessionGuard, ThrottlerGuard],
  exports: [SessionGuard],
})
export class SessionsModule {}
