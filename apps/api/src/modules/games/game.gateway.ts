import { OnEvent } from '@nestjs/event-emitter';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import {
  gameClaimWinEventSchema,
  gameDrawEventSchema,
  gameJoinEventSchema,
  gameMoveEventSchema,
  gameResignEventSchema,
  gameSyncEventSchema,
  roomJoinEventSchema,
} from '@xq/shared-contracts';
import type { Color } from '@xq/xiangqi-core';
import { decodeMove } from '@xq/xiangqi-core';
import { PrismaService } from '../../prisma/prisma.service.js';
import { resolveSessionFromCookieHeader } from '../sessions/session-identity.js';
import { RoomsService } from '../rooms/rooms.service.js';
import { GamesService } from './games.service.js';

export const ABANDONMENT_THRESHOLD_MS = 60_000;

type Presence = { connected: boolean; disconnectedAt: number | null };
type AuthenticatedSocket = Socket & {
  data: {
    user?: { id: string; nickname: string; type: 'guest' | 'registered' };
    joinedGames?: Set<string>;
    ready?: Promise<void>;
  };
};
type GameUpdatedEvent = {
  gameId: string;
  kind: 'move' | 'resign' | 'draw' | 'abandonment';
  moveId?: string;
  move?: { from: string; to: string };
};
type RoomUpdatedEvent = { roomId: string; gameId?: string };

@WebSocketGateway({ cors: { origin: true, credentials: true } })
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly presence = new Map<string, Map<Color, Presence>>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly games: GamesService,
    private readonly rooms: RoomsService,
  ) {}

  handleConnection(client: AuthenticatedSocket): void {
    // Message handlers can be dispatched before this promise settles (NestJS does not await
    // handleConnection before binding @SubscribeMessage listeners), so every handler that reads
    // client.data.user must `await client.data.ready` first rather than assuming it is already set.
    client.data.ready = resolveSessionFromCookieHeader(client.handshake.headers.cookie, this.prisma).then((user) => {
      if (user === null) {
        client.disconnect(true);
        return;
      }
      client.data.user = user;
      client.data.joinedGames = new Set();
    });
  }

  async handleDisconnect(client: AuthenticatedSocket): Promise<void> {
    for (const gameId of client.data.joinedGames ?? []) {
      const players = await this.games.getPlayers(gameId).catch(() => null);
      const userId = client.data.user?.id;
      const color = players?.redId === userId ? 'red' : players?.blackId === userId ? 'black' : null;
      if (color === null) continue;
      const state = this.gamePresence(gameId);
      state.set(color, { connected: false, disconnectedAt: Date.now() });
    }
  }

  @SubscribeMessage('room:join')
  async joinRoom(@ConnectedSocket() client: AuthenticatedSocket, @MessageBody() body: unknown): Promise<void> {
    const parsed = roomJoinEventSchema.safeParse(body);
    if (!parsed.success) return;
    await client.data.ready;
    if (client.data.user === undefined) return;
    const membership = await this.rooms.getRoomById(parsed.data.roomId);
    if (!membership.members.some(({ userId }) => userId === client.data.user!.id)) {
      client.emit('room:join:rejected', { reason: 'NOT_A_ROOM_MEMBER' });
      return;
    }
    // Join the broadcast room BEFORE reading the snapshot to emit: if the room fills and starts
    // concurrently, its room.updated broadcast only reaches sockets already subscribed, so
    // joining first (then re-reading) guarantees we either observe the fresh state directly or
    // receive the broadcast ourselves instead of missing both.
    await client.join(parsed.data.roomId);
    const snapshot = await this.rooms.getRoomById(parsed.data.roomId);
    client.emit('room:state', snapshot);
  }

  @SubscribeMessage('game:join')
  async joinGame(@ConnectedSocket() client: AuthenticatedSocket, @MessageBody() body: unknown): Promise<void> {
    const parsed = gameJoinEventSchema.safeParse(body);
    if (!parsed.success) return;
    await client.data.ready;
    if (client.data.user === undefined) return;
    const players = await this.games.getPlayers(parsed.data.gameId);
    const userId = client.data.user.id;
    const color = players.redId === userId ? 'red' : players.blackId === userId ? 'black' : null;
    if (color === null) {
      client.emit('game:join:rejected', { reason: 'NOT_A_PLAYER' });
      return;
    }
    await client.join(parsed.data.gameId);
    const snapshot = await this.games.getSnapshot(parsed.data.gameId);
    client.data.joinedGames!.add(parsed.data.gameId);
    this.gamePresence(parsed.data.gameId).set(color, { connected: true, disconnectedAt: null });
    client.emit('game:state', snapshot);
  }

  @SubscribeMessage('game:move')
  async submitMove(@ConnectedSocket() client: AuthenticatedSocket, @MessageBody() body: unknown): Promise<void> {
    const parsed = gameMoveEventSchema.safeParse(body);
    if (!parsed.success) return;
    const { gameId, moveId, expectedVersion, move } = parsed.data;
    const color = await this.playerColor(client, gameId);
    if (color === null) {
      const snapshot = await this.games.getSnapshot(gameId);
      client.emit('game:move:rejected', { moveId, reason: 'NOT_A_PLAYER', authoritativeVersion: snapshot.gameVersion });
      return;
    }
    const outcome = await this.games.submitMove(gameId, {
      color, moveId, expectedVersion, move: decodeMove(`${move.from}${move.to}`),
    });
    if (outcome.type === 'accepted') return;
    if (outcome.type === 'duplicate') {
      client.emit('game:state', await this.games.getSnapshot(gameId));
      return;
    }
    const snapshot = await this.games.getSnapshot(gameId);
    client.emit('game:move:rejected', {
      moveId, reason: outcome.reason, authoritativeVersion: snapshot.gameVersion,
    });
  }

  @SubscribeMessage('game:sync')
  async syncGame(@ConnectedSocket() client: AuthenticatedSocket, @MessageBody() body: unknown): Promise<void> {
    const parsed = gameSyncEventSchema.safeParse(body);
    if (!parsed.success) return;
    const color = await this.playerColor(client, parsed.data.gameId);
    if (color === null) {
      client.emit('game:sync:rejected', { reason: 'NOT_A_PLAYER' });
      return;
    }
    client.emit('game:state', await this.games.getSnapshot(parsed.data.gameId));
  }

  @SubscribeMessage('game:resign')
  async resign(@ConnectedSocket() client: AuthenticatedSocket, @MessageBody() body: unknown): Promise<void> {
    const parsed = gameResignEventSchema.safeParse(body);
    if (!parsed.success) return;
    const color = await this.playerColor(client, parsed.data.gameId);
    if (color !== null) await this.games.resign(parsed.data.gameId, color);
  }

  @SubscribeMessage('game:draw')
  async draw(@ConnectedSocket() client: AuthenticatedSocket, @MessageBody() body: unknown): Promise<void> {
    const parsed = gameDrawEventSchema.safeParse(body);
    if (!parsed.success) return;
    const color = await this.playerColor(client, parsed.data.gameId);
    if (color !== null) await this.games.drawOffer(parsed.data.gameId, color, parsed.data.action);
  }

  @SubscribeMessage('game:claim-win')
  async claimWin(@ConnectedSocket() client: AuthenticatedSocket, @MessageBody() body: unknown): Promise<void> {
    const parsed = gameClaimWinEventSchema.safeParse(body);
    if (!parsed.success) return;
    const { gameId } = parsed.data;
    const color = await this.playerColor(client, gameId);
    if (color === null) {
      client.emit('game:claim-win:rejected', { reason: 'NOT_A_PLAYER' });
      return;
    }
    const otherColor: Color = color === 'red' ? 'black' : 'red';
    const disconnectedAt = this.presence.get(gameId)?.get(otherColor)?.disconnectedAt;
    if (disconnectedAt === undefined || disconnectedAt === null || Date.now() - disconnectedAt < ABANDONMENT_THRESHOLD_MS) {
      client.emit('game:claim-win:rejected', { reason: 'ABANDONMENT_THRESHOLD_NOT_MET' });
      return;
    }
    await this.games.abandon(gameId, otherColor);
  }

  @OnEvent('game.updated')
  async onGameUpdated(event: GameUpdatedEvent): Promise<void> {
    const snapshot = await this.games.getSnapshot(event.gameId);
    if (event.kind === 'move' && event.move !== undefined && event.moveId !== undefined) {
      this.server.to(event.gameId).emit('game:move:accepted', {
        move: event.move, moveId: event.moveId, gameVersion: snapshot.gameVersion, clocks: snapshot.clocks,
      });
    }
    if (snapshot.result !== null) {
      this.server.to(event.gameId).emit('game:finished', { result: snapshot.result, finalVersion: snapshot.gameVersion });
    }
    this.server.to(event.gameId).emit('game:state', snapshot);
  }

  @OnEvent('room.updated')
  async onRoomUpdated(event: RoomUpdatedEvent): Promise<void> {
    const snapshot = await this.rooms.getRoomById(event.roomId);
    this.server.to(event.roomId).emit('room:state', snapshot);
  }

  private async playerColor(client: AuthenticatedSocket, gameId: string): Promise<Color | null> {
    await client.data.ready;
    if (client.data.user === undefined) return null;
    const players = await this.games.getPlayers(gameId);
    const userId = client.data.user.id;
    if (players.redId === userId) return 'red';
    if (players.blackId === userId) return 'black';
    return null;
  }

  private gamePresence(gameId: string): Map<Color, Presence> {
    let state = this.presence.get(gameId);
    if (state === undefined) {
      state = new Map();
      this.presence.set(gameId, state);
    }
    return state;
  }
}
