import 'reflect-metadata';
import cookieParser from 'cookie-parser';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { ApiExceptionFilter } from '../../common/filters/api-exception.filter.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { testPrisma } from '../../../test/setup/test-db.js';
import { SESSION_COOKIE_NAME } from '../sessions/session-identity.js';
import { SessionsService } from '../sessions/sessions.service.js';
import { GamesService } from '../games/games.service.js';
import { RoomsModule } from './rooms.module.js';

const sessions = new SessionsService(testPrisma as unknown as PrismaService);
const games = new GamesService(testPrisma as unknown as PrismaService);
const userIds: string[] = [];
const roomIds: string[] = [];
const gameIds: string[] = [];

async function makeUser(nickname: string) {
  const created = await sessions.createGuest({ nickname });
  userIds.push(created.user.id);
  return { user: created.user, cookie: `${SESSION_COOKIE_NAME}=${created.rawToken}` };
}

describe('private rooms (ROOM-01, ROOM-02)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [RoomsModule],
      providers: [ApiExceptionFilter],
    }).overrideProvider(PrismaService).useValue(testPrisma).compile();
    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.useGlobalFilters(app.get(ApiExceptionFilter));
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    if (roomIds.length) {
      await testPrisma.roomMember.deleteMany({ where: { roomId: { in: roomIds } } });
      await testPrisma.room.deleteMany({ where: { id: { in: roomIds } } });
    }
    if (gameIds.length) {
      await testPrisma.gameMove.deleteMany({ where: { gameId: { in: gameIds } } });
      await testPrisma.gameSnapshot.deleteMany({ where: { gameId: { in: gameIds } } });
      await testPrisma.room.updateMany({ where: { gameId: { in: gameIds } }, data: { gameId: null } });
      await testPrisma.game.deleteMany({ where: { id: { in: gameIds } } });
    }
    if (userIds.length) {
      await testPrisma.guestSession.deleteMany({ where: { userId: { in: userIds } } });
      await testPrisma.user.deleteMany({ where: { id: { in: userIds } } });
    }
    await testPrisma.$disconnect();
  });

  async function createRoom(cookie: string, hostColor: 'red' | 'black' | 'random') {
    const response = await request(app.getHttpServer())
      .post('/api/v1/rooms')
      .set('Cookie', cookie)
      .send({ timeControl: { initialMs: 300_000, incrementMs: 5_000 }, hostColor })
      .expect(201);
    roomIds.push(response.body.roomId as string);
    return response.body as {
      roomId: string; code: string; status: string; timeControl: { initialMs: number; incrementMs: number };
      members: Array<{ userId: string; nickname: string; color: 'red' | 'black' | null; isHost: boolean }>;
      gameId: string | null;
    };
  }

  it('ROOM-01: creates rooms with an unambiguous code and fixes the host color at creation', async () => {
    const host = await makeUser('HostRed');
    const redRoom = await createRoom(host.cookie, 'red');
    expect(redRoom.code).toMatch(/^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{8}$/);
    expect(redRoom).toMatchObject({ status: 'WAITING', timeControl: { initialMs: 300_000, incrementMs: 5_000 }, gameId: null });
    expect(redRoom.members).toEqual([{ userId: host.user.id, nickname: 'HostRed', color: 'red', isHost: true }]);

    const blackHost = await makeUser('HostBlack');
    const blackRoom = await createRoom(blackHost.cookie, 'black');
    expect(blackRoom.members[0]?.color).toBe('black');

    const randomHost = await makeUser('HostRandom');
    const randomRoom = await createRoom(randomHost.cookie, 'random');
    expect(['red', 'black']).toContain(randomRoom.members[0]?.color);
  });

  it('ROOM-01: joins the second player, creates and activates a game, and rejects a third player', async () => {
    const host = await makeUser('RoomHost');
    const room = await createRoom(host.cookie, 'black');
    const guest = await makeUser('RoomGuest');
    const joined = await request(app.getHttpServer())
      .post(`/api/v1/rooms/${room.code}/join`)
      .set('Cookie', guest.cookie)
      .send({ nickname: 'RenamedGuest' })
      .expect(201);

    expect(joined.body).toMatchObject({ status: 'STARTED', gameId: expect.any(String) });
    gameIds.push(joined.body.gameId as string);
    expect(joined.body.members).toEqual(expect.arrayContaining([
      expect.objectContaining({ userId: host.user.id, color: 'black', isHost: true }),
      expect.objectContaining({ userId: guest.user.id, nickname: 'RenamedGuest', color: 'red', isHost: false }),
    ]));
    const game = await testPrisma.game.findUniqueOrThrow({ where: { id: joined.body.gameId as string } });
    expect(game).toMatchObject({ status: 'ACTIVE', redId: guest.user.id, blackId: host.user.id, initialMs: 300_000, incrementMs: 5_000 });

    const third = await makeUser('ThirdPlayer');
    const rejected = await request(app.getHttpServer())
      .post(`/api/v1/rooms/${room.code}/join`)
      .set('Cookie', third.cookie)
      .send({})
      .expect(409);
    expect(rejected.body.error.message).toBe('ROOM_FULL');
  });

  it('ROOM-02: returns the standard not-found envelope for a missing room code', async () => {
    const user = await makeUser('MissingRoom');
    const response = await request(app.getHttpServer())
      .post('/api/v1/rooms/23456789/join')
      .set('Cookie', user.cookie)
      .send({})
      .expect(404);
    expect(response.body.error).toMatchObject({ code: 'NOT_FOUND', message: 'ROOM_NOT_FOUND' });
  });

  it('ROOM-01: lets the host re-fetch by joining without adding another membership', async () => {
    const host = await makeUser('IdempotentHost');
    const room = await createRoom(host.cookie, 'red');
    const repeated = await request(app.getHttpServer())
      .post(`/api/v1/rooms/${room.code}/join`)
      .set('Cookie', host.cookie)
      .send({})
      .expect(201);
    expect(repeated.body.roomId).toBe(room.roomId);
    expect(await testPrisma.roomMember.count({ where: { roomId: room.roomId } })).toBe(1);
  });

  it('ROOM-01: lets any authenticated user read the current room snapshot', async () => {
    const host = await makeUser('ReadableHost');
    const room = await createRoom(host.cookie, 'random');
    const reader = await makeUser('NonMember');
    const response = await request(app.getHttpServer())
      .get(`/api/v1/rooms/${room.code}`)
      .set('Cookie', reader.cookie)
      .expect(200);
    expect(response.body).toMatchObject({ roomId: room.roomId, code: room.code, status: 'WAITING', gameId: null });
  });

  describe('rematch (ADR-022)', () => {
    async function createFinishedRoom() {
      const host = await makeUser(`RematchHost${Math.random()}`);
      const room = await createRoom(host.cookie, 'red');
      const guest = await makeUser(`RematchGuest${Math.random()}`);
      const joined = await request(app.getHttpServer())
        .post(`/api/v1/rooms/${room.code}/join`)
        .set('Cookie', guest.cookie)
        .send({})
        .expect(201);
      const gameId = joined.body.gameId as string;
      gameIds.push(gameId);
      await games.resign(gameId, 'black');
      return { host, guest, room, gameId };
    }

    it('one member requesting a rematch alone does not start a new game', async () => {
      const { host, room, gameId } = await createFinishedRoom();
      const response = await request(app.getHttpServer())
        .post(`/api/v1/rooms/${room.code}/rematch`)
        .set('Cookie', host.cookie)
        .send({})
        .expect(201);
      expect(response.body.gameId).toBe(gameId);
      expect(response.body.rematchVotes).toEqual([host.user.id]);
    });

    it('both members requesting a rematch starts a new game with colors swapped', async () => {
      const { host, guest, room, gameId } = await createFinishedRoom();
      const before = await testPrisma.roomMember.findMany({ where: { roomId: room.roomId } });
      const hostColorBefore = before.find((member) => member.userId === host.user.id)?.color;
      const guestColorBefore = before.find((member) => member.userId === guest.user.id)?.color;

      await request(app.getHttpServer())
        .post(`/api/v1/rooms/${room.code}/rematch`)
        .set('Cookie', host.cookie)
        .send({})
        .expect(201);
      const second = await request(app.getHttpServer())
        .post(`/api/v1/rooms/${room.code}/rematch`)
        .set('Cookie', guest.cookie)
        .send({})
        .expect(201);

      const newGameId = second.body.gameId as string;
      expect(newGameId).not.toBe(gameId);
      gameIds.push(newGameId);
      expect(second.body.rematchVotes).toEqual([]);

      const after = await testPrisma.roomMember.findMany({ where: { roomId: room.roomId } });
      const hostColorAfter = after.find((member) => member.userId === host.user.id)?.color;
      const guestColorAfter = after.find((member) => member.userId === guest.user.id)?.color;
      expect(hostColorAfter).not.toBe(hostColorBefore);
      expect(guestColorAfter).not.toBe(guestColorBefore);

      // createFinishedRoom() always makes the host RED and the guest BLACK, so after the swap
      // the previously-black guest should be the new game's red player, and vice versa.
      expect(hostColorBefore).toBe('RED');
      expect(guestColorBefore).toBe('BLACK');
      const newGame = await testPrisma.game.findUniqueOrThrow({ where: { id: newGameId } });
      expect(newGame.redId).toBe(guest.user.id);
      expect(newGame.blackId).toBe(host.user.id);
    });

    it('requesting a rematch before the current game has finished is rejected', async () => {
      const host = await makeUser(`RematchActiveHost${Math.random()}`);
      const room = await createRoom(host.cookie, 'red');
      const guest = await makeUser(`RematchActiveGuest${Math.random()}`);
      const joined = await request(app.getHttpServer())
        .post(`/api/v1/rooms/${room.code}/join`)
        .set('Cookie', guest.cookie)
        .send({})
        .expect(201);
      gameIds.push(joined.body.gameId as string);

      const response = await request(app.getHttpServer())
        .post(`/api/v1/rooms/${room.code}/rematch`)
        .set('Cookie', host.cookie)
        .send({})
        .expect(409);
      expect(response.body.error.message).toBe('GAME_NOT_FINISHED');
    });

    it('requesting a rematch as a non-member is rejected', async () => {
      const { room } = await createFinishedRoom();
      const outsider = await makeUser(`RematchOutsider${Math.random()}`);
      const response = await request(app.getHttpServer())
        .post(`/api/v1/rooms/${room.code}/rematch`)
        .set('Cookie', outsider.cookie)
        .send({})
        .expect(409);
      expect(response.body.error.message).toBe('NOT_A_ROOM_MEMBER');
    });
  });

  it('ROOM-02: rate limits repeated join attempts by IP', async () => {
    const user = await makeUser('RateLimited');
    const room = await createRoom(user.cookie, 'red');
    const results = await Promise.all(Array.from({ length: 12 }, () =>
      request(app.getHttpServer())
        .post(`/api/v1/rooms/${room.code}/join`)
        .set('Cookie', user.cookie)
        .send({}),
    ));
    expect(results.some(({ status }) => status === 429)).toBe(true);
  });
});
