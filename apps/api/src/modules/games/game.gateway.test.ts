import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { io, type Socket as ClientSocket } from 'socket.io-client';
import type { Color } from '@xq/xiangqi-core';
import { PrismaService } from '../../prisma/prisma.service.js';
import { testPrisma } from '../../../test/setup/test-db.js';
import { SessionsService } from '../sessions/sessions.service.js';
import { SESSION_COOKIE_NAME } from '../sessions/session-identity.js';
import { RoomsModule } from '../rooms/rooms.module.js';
import { RoomsService } from '../rooms/rooms.service.js';
import { GamesService } from './games.service.js';
import { GameGateway, ABANDONMENT_THRESHOLD_MS } from './game.gateway.js';

const startFen = 'rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w - - 0 1';
const sessions = new SessionsService(testPrisma as unknown as PrismaService);
const games = new GamesService(testPrisma as unknown as PrismaService);
const userIds: string[] = [];
const gameIds: string[] = [];
const roomIds: string[] = [];
const sockets: ClientSocket[] = [];

async function makePlayer(nickname: string) {
  const created = await sessions.createGuest({ nickname });
  userIds.push(created.user.id);
  return {
    id: created.user.id,
    nickname: created.user.nickname,
    type: 'guest' as const,
    cookie: `${SESSION_COOKIE_NAME}=${created.rawToken}`,
  };
}

async function makeGame(redId: string, blackId: string): Promise<string> {
  const { gameId } = await games.createGame(startFen, null, redId, blackId);
  gameIds.push(gameId);
  await games.activateGame(gameId);
  return gameId;
}

function once<T = unknown>(socket: ClientSocket, event: string, timeoutMs = 4_000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out waiting for ${event}`)), timeoutMs);
    socket.once(event, (value: T) => {
      clearTimeout(timer);
      resolve(value);
    });
  });
}

function connect(url: string, cookie?: string): Promise<ClientSocket> {
  const socket = io(url, {
    transports: ['websocket'],
    ...(cookie === undefined ? {} : { extraHeaders: { Cookie: cookie } }),
  });
  sockets.push(socket);
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Socket connection timed out')), 4_000);
    socket.once('connect', () => {
      clearTimeout(timer);
      resolve(socket);
    });
    socket.once('connect_error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}

describe('GameGateway realtime lifecycle (SYNC-01/02/03, ROOM-02)', () => {
  let app: INestApplication;
  let url: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [RoomsModule] })
      .overrideProvider(PrismaService).useValue(testPrisma)
      .compile();
    app = moduleRef.createNestApplication();
    await app.init();
    await app.listen(0, '127.0.0.1');
    const address = app.getHttpServer().address() as { port: number };
    url = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    for (const socket of sockets) socket.disconnect();
    await app.close();
    if (roomIds.length > 0) {
      await testPrisma.roomMember.deleteMany({ where: { roomId: { in: roomIds } } });
      await testPrisma.room.deleteMany({ where: { id: { in: roomIds } } });
    }
    if (gameIds.length > 0) {
      await testPrisma.gameMove.deleteMany({ where: { gameId: { in: gameIds } } });
      await testPrisma.gameSnapshot.deleteMany({ where: { gameId: { in: gameIds } } });
      await testPrisma.game.deleteMany({ where: { id: { in: gameIds } } });
    }
    if (userIds.length > 0) {
      await testPrisma.guestSession.deleteMany({ where: { userId: { in: userIds } } });
      await testPrisma.user.deleteMany({ where: { id: { in: userIds } } });
    }
    await testPrisma.$disconnect();
  });

  it('disconnects clients without a valid session cookie', async () => {
    const socket = io(url, { transports: ['websocket'] });
    sockets.push(socket);
    await once(socket, 'disconnect');
    expect(socket.connected).toBe(false);
  });

  it('joins authenticated sockets to a room and broadcasts membership/game-start snapshots (ROOM-02)', async () => {
    const host = await makePlayer('RoomHost');
    const guest = await makePlayer('RoomGuest');
    const room = await app.get(RoomsService).createRoom(host, { initialMs: 300_000, incrementMs: 0 }, 'red');
    roomIds.push(room.roomId);
    const hostSocket = await connect(url, host.cookie);
    const hostInitial = once<{ roomId: string; status: string }>(hostSocket, 'room:state');
    hostSocket.emit('room:join', { roomId: room.roomId });
    expect(await hostInitial).toMatchObject({ roomId: room.roomId, status: 'WAITING' });

    // Guest is not yet a room member, so under ROOM-02 their socket cannot pre-subscribe before
    // joining via REST; the host's already-subscribed socket still catches the broadcast once the
    // room starts.
    const hostUpdated = once<{ roomId: string; status: string; gameId: string | null }>(hostSocket, 'room:state');
    const started = await app.get(RoomsService).joinRoom(room.code, guest);
    if (started.gameId !== null) gameIds.push(started.gameId);
    expect(await hostUpdated).toMatchObject({ roomId: room.roomId, status: 'STARTED' });

    const guestSocket = await connect(url, guest.cookie);
    const guestInitial = once<{ roomId: string; status: string }>(guestSocket, 'room:state');
    guestSocket.emit('room:join', { roomId: room.roomId });
    expect(await guestInitial).toMatchObject({ roomId: room.roomId, status: 'STARTED' });
  });

  it('ROOM-02 allows room members to join and rejects non-members without room broadcasts', async () => {
    const host = await makePlayer('RoomMember');
    const guest = await makePlayer('RoomOtherMember');
    const outsider = await makePlayer('RoomOutsider');
    const room = await app.get(RoomsService).createRoom(host, { initialMs: 300_000, incrementMs: 0 }, 'red');
    roomIds.push(room.roomId);
    const hostSocket = await connect(url, host.cookie);
    const outsiderSocket = await connect(url, outsider.cookie);

    const hostState = once<{ roomId: string; members: Array<{ userId: string }> }>(hostSocket, 'room:state');
    hostSocket.emit('room:join', { roomId: room.roomId });
    expect(await hostState).toMatchObject({ roomId: room.roomId, members: [{ userId: host.id }] });

    const rejected = once<{ reason: string }>(outsiderSocket, 'room:join:rejected');
    const noRoomState = once(outsiderSocket, 'room:state', 300).then(() => false, () => true);
    outsiderSocket.emit('room:join', { roomId: room.roomId });
    expect(await rejected).toMatchObject({ reason: 'NOT_A_ROOM_MEMBER' });
    const hostUpdated = once<{ status: string }>(hostSocket, 'room:state');
    const started = await app.get(RoomsService).joinRoom(room.code, guest);
    if (started.gameId !== null) gameIds.push(started.gameId);
    expect(await hostUpdated).toMatchObject({ status: 'STARTED' });
    expect(await noRoomState).toBe(true);
  });

  it('SYNC-03 ROOM-02: a room:join racing a concurrent fill still returns the fresh snapshot, not a stale catch-up', async () => {
    const host = await makePlayer('RaceHost');
    const guest = await makePlayer('RaceGuest');
    const room = await app.get(RoomsService).createRoom(host, { initialMs: 300_000, incrementMs: 0 }, 'red');
    roomIds.push(room.roomId);
    const hostSocket = await connect(url, host.cookie);

    // Force the exact window the gateway's room:join must survive: its membership-check read
    // observes the room before a concurrent fill, the fill commits (member added + STARTED),
    // and only then does the post-join read run. If room:join emitted the pre-join read instead
    // of re-reading after subscribing, this would wrongly hand back a stale WAITING snapshot.
    const roomsService = app.get(RoomsService);
    const realGetRoomById = roomsService.getRoomById.bind(roomsService);
    let calls = 0;
    const spy = vi.spyOn(roomsService, 'getRoomById').mockImplementation(async (roomId: string) => {
      calls += 1;
      if (calls === 1) {
        const snapshot = await realGetRoomById(roomId);
        const started = await roomsService.joinRoom(room.code, guest);
        if (started.gameId !== null) gameIds.push(started.gameId);
        return snapshot;
      }
      return realGetRoomById(roomId);
    });

    const state = once<{ status: string; gameId: string | null }>(hostSocket, 'room:state');
    hostSocket.emit('room:join', { roomId: room.roomId });
    expect(await state).toMatchObject({ status: 'STARTED' });
    spy.mockRestore();
  });

  it('ROOM-02 allows game players to join and rejects non-players without game broadcasts', async () => {
    const red = await makePlayer('JoinRed');
    const black = await makePlayer('JoinBlack');
    const outsider = await makePlayer('JoinOutsider');
    const gameId = await makeGame(red.id, black.id);
    const redSocket = await connect(url, red.cookie);
    const outsiderSocket = await connect(url, outsider.cookie);

    const redState = once<{ gameId: string; redPlayerId: string }>(redSocket, 'game:state');
    redSocket.emit('game:join', { gameId });
    expect(await redState).toMatchObject({ gameId, redPlayerId: red.id });

    const rejected = once<{ reason: string }>(outsiderSocket, 'game:join:rejected');
    const noInitialState = once(outsiderSocket, 'game:state', 300).then(() => false, () => true);
    outsiderSocket.emit('game:join', { gameId });
    expect(await rejected).toMatchObject({ reason: 'NOT_A_PLAYER' });
    expect(await noInitialState).toBe(true);

    const redAccepted = once(redSocket, 'game:move:accepted');
    const noAccepted = once(outsiderSocket, 'game:move:accepted', 300).then(() => false, () => true);
    const noBroadcastState = once(outsiderSocket, 'game:state', 300).then(() => false, () => true);
    redSocket.emit('game:move', {
      gameId, moveId: `join-auth-${gameId}`, expectedVersion: 0, move: { from: 'b2', to: 'e2' },
    });
    await redAccepted;
    expect(await Promise.all([noAccepted, noBroadcastState])).toEqual([true, true]);
  });

  it('ROOM-02 allows game players to sync and rejects non-players without game broadcasts', async () => {
    const red = await makePlayer('SyncRed');
    const black = await makePlayer('SyncBlack');
    const outsider = await makePlayer('SyncOutsider');
    const gameId = await makeGame(red.id, black.id);
    const redSocket = await connect(url, red.cookie);
    const outsiderSocket = await connect(url, outsider.cookie);

    const redJoin = once(redSocket, 'game:state');
    redSocket.emit('game:join', { gameId });
    await redJoin;
    const redSynced = once<{ gameId: string; redPlayerId: string }>(redSocket, 'game:state');
    redSocket.emit('game:sync', { gameId });
    expect(await redSynced).toMatchObject({ gameId, redPlayerId: red.id });

    const rejected = once<{ reason: string }>(outsiderSocket, 'game:sync:rejected');
    const noInitialState = once(outsiderSocket, 'game:state', 300).then(() => false, () => true);
    outsiderSocket.emit('game:sync', { gameId });
    expect(await rejected).toMatchObject({ reason: 'NOT_A_PLAYER' });
    expect(await noInitialState).toBe(true);

    const redAccepted = once(redSocket, 'game:move:accepted');
    const noAccepted = once(outsiderSocket, 'game:move:accepted', 300).then(() => false, () => true);
    const noBroadcastState = once(outsiderSocket, 'game:state', 300).then(() => false, () => true);
    redSocket.emit('game:move', {
      gameId, moveId: `sync-auth-${gameId}`, expectedVersion: 0, move: { from: 'b2', to: 'e2' },
    });
    await redAccepted;
    expect(await Promise.all([noAccepted, noBroadcastState])).toEqual([true, true]);
  });

  it('broadcasts the accepted move and authoritative snapshot to both players', async () => {
    const red = await makePlayer('GatewayRed');
    const black = await makePlayer('GatewayBlack');
    const gameId = await makeGame(red.id, black.id);
    const redSocket = await connect(url, red.cookie);
    const blackSocket = await connect(url, black.cookie);
    const redJoin = once(redSocket, 'game:state');
    const blackJoin = once(blackSocket, 'game:state');
    redSocket.emit('game:join', { gameId });
    blackSocket.emit('game:join', { gameId });
    await Promise.all([redJoin, blackJoin]);

    const redAccepted = once(redSocket, 'game:move:accepted');
    const blackAccepted = once(blackSocket, 'game:move:accepted');
    const redState = once(redSocket, 'game:state');
    const blackState = once(blackSocket, 'game:state');
    redSocket.emit('game:move', {
      gameId, moveId: `wire-${gameId}`, expectedVersion: 0, move: { from: 'b2', to: 'e2' },
    });
    await Promise.all([redAccepted, blackAccepted]);
    expect(await redState).toMatchObject({ gameId, gameVersion: 1, moves: ['b2e2'] });
    expect(await blackState).toMatchObject({ gameId, gameVersion: 1, moves: ['b2e2'] });
  });

  it('rejects illegal and wrong-turn moves only to the sender', async () => {
    const red = await makePlayer('RejectRed');
    const black = await makePlayer('RejectBlack');
    const gameId = await makeGame(red.id, black.id);
    const redSocket = await connect(url, red.cookie);
    const blackSocket = await connect(url, black.cookie);
    redSocket.emit('game:join', { gameId });
    blackSocket.emit('game:join', { gameId });
    await Promise.all([once(redSocket, 'game:state'), once(blackSocket, 'game:state')]);

    const redRejected = once<{ reason: string; authoritativeVersion: number }>(redSocket, 'game:move:rejected');
    redSocket.emit('game:move', {
      gameId, moveId: `illegal-${gameId}`, expectedVersion: 0, move: { from: 'a0', to: 'b0' },
    });
    expect(await redRejected).toMatchObject({ reason: 'ILLEGAL_MOVE', authoritativeVersion: 0 });
    const noBlackEvent = once(blackSocket, 'game:move:rejected', 150).then(() => true, () => false);
    expect(await noBlackEvent).toBe(false);

    const blackRejected = once<{ reason: string }>(blackSocket, 'game:move:rejected');
    blackSocket.emit('game:move', {
      gameId, moveId: `turn-${gameId}`, expectedVersion: 0, move: { from: 'b7', to: 'g7' },
    });
    expect(await blackRejected).toMatchObject({ reason: 'NOT_YOUR_TURN' });
  });

  it('serializes simultaneous same-version submissions and persists one move row (SYNC-01)', async () => {
    const red = await makePlayer('RaceRed');
    const black = await makePlayer('RaceBlack');
    const gameId = await makeGame(red.id, black.id);
    const redSocket = await connect(url, red.cookie);
    const blackSocket = await connect(url, black.cookie);
    redSocket.emit('game:join', { gameId });
    blackSocket.emit('game:join', { gameId });
    await Promise.all([once(redSocket, 'game:state'), once(blackSocket, 'game:state')]);
    const acceptedEvents = [once(redSocket, 'game:move:accepted'), once(blackSocket, 'game:move:accepted')];
    redSocket.emit('game:move', {
      gameId, moveId: `race-red-${gameId}`, expectedVersion: 0, move: { from: 'b2', to: 'e2' },
    });
    blackSocket.emit('game:move', {
      gameId, moveId: `race-black-${gameId}`, expectedVersion: 0, move: { from: 'b7', to: 'g7' },
    });
    await Promise.all(acceptedEvents);
    expect(await testPrisma.gameMove.count({ where: { gameId } })).toBe(1);
  });

  it('broadcasts REST-originated resignation and supports thresholded abandonment claims', async () => {
    const red = await makePlayer('FinishRed');
    const black = await makePlayer('FinishBlack');
    const gameId = await makeGame(red.id, black.id);
    const redSocket = await connect(url, red.cookie);
    const blackSocket = await connect(url, black.cookie);
    redSocket.emit('game:join', { gameId });
    blackSocket.emit('game:join', { gameId });
    await Promise.all([once(redSocket, 'game:state'), once(blackSocket, 'game:state')]);
    const finished = once(redSocket, 'game:finished');
    await app.get(GamesService).resign(gameId, 'black');
    expect(await finished).toMatchObject({ result: { winner: 'red', reason: 'RESIGNATION' }, finalVersion: 1 });

    const claimGame = await makeGame(red.id, black.id);
    const redClaimSocket = await connect(url, red.cookie);
    const blackClaimSocket = await connect(url, black.cookie);
    redClaimSocket.emit('game:join', { gameId: claimGame });
    blackClaimSocket.emit('game:join', { gameId: claimGame });
    await Promise.all([once(redClaimSocket, 'game:state'), once(blackClaimSocket, 'game:state')]);
    const rejected = once(redClaimSocket, 'game:claim-win:rejected');
    blackClaimSocket.disconnect();
    redClaimSocket.emit('game:claim-win', { gameId: claimGame });
    expect(await rejected).toMatchObject({ reason: 'ABANDONMENT_THRESHOLD_NOT_MET' });
    const gateway = app.get(GameGateway) as unknown as {
      presence: Map<string, Map<Color, { connected: boolean; disconnectedAt: number | null }>>;
    };
    gateway.presence.get(claimGame)?.set('black', { connected: false, disconnectedAt: Date.now() - ABANDONMENT_THRESHOLD_MS - 1 });
    const abandoned = once(redClaimSocket, 'game:finished');
    redClaimSocket.emit('game:claim-win', { gameId: claimGame });
    expect(await abandoned).toMatchObject({ result: { winner: 'red', reason: 'ABANDONMENT' } });
  });
});
