import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import {
  createRoomRequestSchema,
  joinRoomRequestSchema,
} from '@xq/shared-contracts';
import type { CreateRoomRequest, JoinRoomRequest, RoomSnapshot, UserSummary } from '@xq/shared-contracts';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { CurrentUser } from '../sessions/current-user.decorator.js';
import { SessionGuard } from '../sessions/session.guard.js';
import { RoomsService } from './rooms.service.js';

@Controller('rooms')
@UseGuards(SessionGuard)
export class RoomsController {
  constructor(private readonly rooms: RoomsService) {}

  @Post()
  createRoom(
    @CurrentUser() user: UserSummary,
    @Body(new ZodValidationPipe(createRoomRequestSchema)) body: CreateRoomRequest,
  ): Promise<RoomSnapshot> {
    return this.rooms.createRoom(user, body.timeControl, body.hostColor);
  }

  @Post(':code/join')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  joinRoom(
    @Param('code') code: string,
    @CurrentUser() user: UserSummary,
    @Body(new ZodValidationPipe(joinRoomRequestSchema)) body: JoinRoomRequest,
  ): Promise<RoomSnapshot> {
    return this.rooms.joinRoom(code, user, body.nickname);
  }

  @Get(':code')
  getRoom(@Param('code') code: string): Promise<RoomSnapshot> {
    return this.rooms.getRoom(code);
  }

  @Post(':code/rematch')
  requestRematch(@Param('code') code: string, @CurrentUser() user: UserSummary): Promise<RoomSnapshot> {
    return this.rooms.requestRematch(code, user);
  }
}
