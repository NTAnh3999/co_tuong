import { randomInt } from 'node:crypto';
import { ConflictException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma } from '@prisma/client';
import { createInitialPosition, toFen } from '@xq/xiangqi-core';
import type { RoomSnapshot, TimeControl, UserSummary } from '@xq/shared-contracts';
import { PrismaService } from '../../prisma/prisma.service.js';
import { GamesService } from '../games/games.service.js';
import { SessionsService } from '../sessions/sessions.service.js';

const CODE_CHARACTERS = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const ROOM_CODE_LENGTH = 8;
const MAX_CODE_ATTEMPTS = 10;
const STARTING_FEN = toFen(createInitialPosition());

type RoomColor = 'RED' | 'BLACK';

@Injectable()
export class RoomsService {
  private readonly rematchVotes = new Map<string, Set<string>>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly sessions: SessionsService,
    private readonly games: GamesService,
    @Optional() private readonly eventEmitter?: EventEmitter2,
  ) {}

  async createRoom(host: UserSummary, timeControl: TimeControl, hostColor: 'red' | 'black' | 'random'): Promise<RoomSnapshot> {
    const resolvedColor: RoomColor = hostColor === 'random'
      ? (randomInt(2) === 0 ? 'RED' : 'BLACK')
      : hostColor === 'red' ? 'RED' : 'BLACK';

    for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt += 1) {
      try {
        const room = await this.prisma.$transaction(async (tx) => {
          const created = await tx.room.create({
            data: {
              code: this.createCode(), hostId: host.id, status: 'WAITING',
              initialMs: timeControl.initialMs, incrementMs: timeControl.incrementMs,
              members: { create: { userId: host.id, color: resolvedColor, isHost: true } },
            },
            include: { members: { include: { user: true } } },
          });
          return created;
        });
        const snapshot = this.toSnapshot(room, []);
        this.eventEmitter?.emit('room.updated', { roomId: snapshot.roomId });
        return snapshot;
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002' && attempt + 1 < MAX_CODE_ATTEMPTS) {
          continue;
        }
        throw error;
      }
    }
    throw new Error('Unable to generate a unique room code');
  }

  async joinRoom(code: string, user: UserSummary, nickname?: string): Promise<RoomSnapshot> {
    if (nickname !== undefined) await this.sessions.updateNickname(user.id, nickname);

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw(Prisma.sql`SELECT id FROM "Room" WHERE code = ${code} FOR UPDATE`);
      const room = await tx.room.findUnique({
        where: { code },
        include: { members: { include: { user: true } } },
      });
      if (!room) return { type: 'not-found' as const };

      const existingMember = room.members.find(({ userId }) => userId === user.id);
      if (existingMember?.isHost) return { type: 'snapshot' as const, room };
      if (room.status !== 'WAITING' || room.members.length >= 2) return { type: 'full' as const };
      if (existingMember) return { type: 'snapshot' as const, room };

      const hostMember = room.members.find(({ isHost }) => isHost);
      const seat: RoomColor = hostMember?.color === 'RED' ? 'BLACK' : 'RED';
      await tx.roomMember.create({ data: { roomId: room.id, userId: user.id, color: seat, isHost: false } });
      const updated = await tx.room.findUniqueOrThrow({
        where: { id: room.id },
        include: { members: { include: { user: true } } },
      });
      return { type: 'joined' as const, room: updated };
    });

    if (result.type === 'not-found') throw new NotFoundException('ROOM_NOT_FOUND');
    if (result.type === 'full') throw new ConflictException('ROOM_FULL');
    if (result.type !== 'joined' || result.room.members.length !== 2) {
      const snapshot = this.toSnapshot(result.room, this.votesFor(result.room.id));
      if (result.type === 'joined') this.eventEmitter?.emit('room.updated', { roomId: snapshot.roomId });
      return snapshot;
    }

    const red = result.room.members.find(({ color }) => color === 'RED');
    const black = result.room.members.find(({ color }) => color === 'BLACK');
    if (!red || !black) throw new Error('A full room must have one red seat and one black seat');

    const { gameId } = await this.games.createGame(
      STARTING_FEN,
      { initialMs: result.room.initialMs, incrementMs: result.room.incrementMs },
      red.userId,
      black.userId,
    );
    await this.games.activateGame(gameId);
    const started = await this.prisma.room.update({
      where: { id: result.room.id },
      data: { gameId, status: 'STARTED' },
      include: { members: { include: { user: true } } },
    });
    const snapshot = this.toSnapshot(started, this.votesFor(started.id));
    this.eventEmitter?.emit('room.updated', { roomId: snapshot.roomId, gameId });
    return snapshot;
  }

  async getRoom(code: string): Promise<RoomSnapshot> {
    const room = await this.prisma.room.findUnique({
      where: { code },
      include: { members: { include: { user: true } } },
    });
    if (!room) throw new NotFoundException('ROOM_NOT_FOUND');
    return this.toSnapshot(room, this.votesFor(room.id));
  }

  async getRoomById(roomId: string): Promise<RoomSnapshot> {
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
      include: { members: { include: { user: true } } },
    });
    if (!room) throw new NotFoundException('ROOM_NOT_FOUND');
    return this.toSnapshot(room, this.votesFor(room.id));
  }

  async requestRematch(code: string, user: UserSummary): Promise<RoomSnapshot> {
    const result = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw(Prisma.sql`SELECT id FROM "Room" WHERE code = ${code} FOR UPDATE`);
      const room = await tx.room.findUnique({
        where: { code },
        include: { members: { include: { user: true } } },
      });
      if (!room) throw new NotFoundException('ROOM_NOT_FOUND');
      if (!room.members.some(({ userId }) => userId === user.id)) throw new ConflictException('NOT_A_ROOM_MEMBER');
      if (!room.gameId) throw new ConflictException('ROOM_GAME_NOT_STARTED');
      const game = await this.games.getSnapshot(room.gameId);
      if (game.status === 'ACTIVE') throw new ConflictException('GAME_NOT_FINISHED');

      const votes = this.rematchVotes.get(room.id) ?? new Set<string>();
      votes.add(user.id);
      this.rematchVotes.set(room.id, votes);
      const members = room.members;
      if (members.length !== 2 || !members[0] || !members[1]) {
        throw new ConflictException('ROOM_MEMBERS_INCOMPLETE');
      }
      if (members.some(({ color }) => color === null)) throw new ConflictException('ROOM_COLORS_NOT_ASSIGNED');

      if (members.every(({ userId }) => votes.has(userId))) {
        const red = members.find(({ color }) => color === 'RED');
        const black = members.find(({ color }) => color === 'BLACK');
        if (!red || !black) throw new ConflictException('ROOM_COLORS_NOT_ASSIGNED');
        const { gameId } = await this.games.createGame(
          STARTING_FEN,
          { initialMs: room.initialMs, incrementMs: room.incrementMs },
          black.userId,
          red.userId,
        );
        await this.games.activateGame(gameId);
        const updated = await tx.room.update({
          where: { id: room.id },
          data: {
            gameId,
            members: {
              update: [
                { where: { roomId_userId: { roomId: room.id, userId: red.userId } }, data: { color: 'BLACK' } },
                { where: { roomId_userId: { roomId: room.id, userId: black.userId } }, data: { color: 'RED' } },
              ],
            },
          },
          include: { members: { include: { user: true } } },
        });
        this.rematchVotes.delete(room.id);
        return { room: updated, gameId, votes: [] as string[] };
      }
      return { room, gameId: null, votes: Array.from(votes) };
    });

    const snapshot = this.toSnapshot(result.room, result.votes);
    if (result.gameId !== null) this.eventEmitter?.emit('room.updated', { roomId: snapshot.roomId, gameId: result.gameId });
    return snapshot;
  }

  private createCode(): string {
    return Array.from({ length: ROOM_CODE_LENGTH }, () => CODE_CHARACTERS[randomInt(CODE_CHARACTERS.length)]!).join('');
  }

  private votesFor(roomId: string): string[] {
    return Array.from(this.rematchVotes.get(roomId) ?? []);
  }

  private toSnapshot(room: {
    id: string;
    code: string;
    status: 'WAITING' | 'READY' | 'STARTED' | 'CLOSED';
    initialMs: number;
    incrementMs: number;
    gameId: string | null;
    members: Array<{ userId: string; color: RoomColor | null; isHost: boolean; user: { nickname: string } }>;
  }, rematchVotes: string[]): RoomSnapshot {
    return {
      roomId: room.id,
      code: room.code,
      status: room.status,
      timeControl: { initialMs: room.initialMs, incrementMs: room.incrementMs },
      members: room.members.map((member) => ({
        userId: member.userId,
        nickname: member.user.nickname,
        color: member.color === null ? null : member.color === 'RED' ? 'red' : 'black',
        isHost: member.isHost,
      })),
      gameId: room.gameId,
      rematchVotes,
    };
  }
}
