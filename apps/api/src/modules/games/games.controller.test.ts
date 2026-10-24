import 'reflect-metadata';
import cookieParser from 'cookie-parser';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { decodeMove } from '@xq/xiangqi-core';
import { ApiExceptionFilter } from '../../common/filters/api-exception.filter.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { testPrisma } from '../../../test/setup/test-db.js';
import { SESSION_COOKIE_NAME } from '../sessions/session-identity.js';
import { SessionsService } from '../sessions/sessions.service.js';
import { GamesService } from './games.service.js';
import { GamesModule } from './games.module.js';

const startFen = 'rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w - - 0 1';
const sessions = new SessionsService(testPrisma as unknown as PrismaService);
const games = new GamesService(testPrisma as unknown as PrismaService);
const userIds: string[] = [];
const gameIds: string[] = [];

async function makeUser(nickname: string) {
  const created = await sessions.createGuest({ nickname });
  userIds.push(created.user.id);
  return { id: created.user.id, cookie: `${SESSION_COOKIE_NAME}=${created.rawToken}` };
}

async function makeGame(redId: string, blackId: string) {
  const { gameId } = await games.createGame(startFen, null, redId, blackId);
  gameIds.push(gameId);
  await games.activateGame(gameId);
  return gameId;
}

describe('games REST controller (DATA-01)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [GamesModule],
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
    if (gameIds.length) {
      await testPrisma.gameMove.deleteMany({ where: { gameId: { in: gameIds } } });
      await testPrisma.gameSnapshot.deleteMany({ where: { gameId: { in: gameIds } } });
      await testPrisma.game.deleteMany({ where: { id: { in: gameIds } } });
    }
    if (userIds.length) {
      await testPrisma.guestSession.deleteMany({ where: { userId: { in: userIds } } });
      await testPrisma.user.deleteMany({ where: { id: { in: userIds } } });
    }
    await testPrisma.$disconnect();
  });

  it('DATA-01: returns an existing snapshot and a not-found response for a missing game', async () => {
    const red = await makeUser('SnapshotRed');
    const black = await makeUser('SnapshotBlack');
    const gameId = await makeGame(red.id, black.id);
    const response = await request(app.getHttpServer()).get(`/api/v1/games/${gameId}`).set('Cookie', red.cookie).expect(200);
    expect(response.body).toMatchObject({ gameId, status: 'ACTIVE', moves: [], redPlayerId: red.id, blackPlayerId: black.id });
    const missing = await request(app.getHttpServer()).get('/api/v1/games/missing-game').set('Cookie', red.cookie).expect(404);
    expect(missing.body.error.message).toBe('GAME_NOT_FOUND');
  });

  it('DATA-01: paginates move history by ply cursor', async () => {
    const red = await makeUser('MovesRed');
    const black = await makeUser('MovesBlack');
    const gameId = await makeGame(red.id, black.id);
    const sequence = [
      ['red', 'b2e2'], ['black', 'b7g7'], ['red', 'e2c2'], ['black', 'f9e8'],
    ] as const;
    for (const [index, [color, uci]] of sequence.entries()) {
      expect((await games.submitMove(gameId, {
        color, moveId: `page-${gameId}-${index}`, expectedVersion: index, move: decodeMove(uci),
      })).type).toBe('accepted');
    }
    const first = await request(app.getHttpServer()).get(`/api/v1/games/${gameId}/moves?limit=2`).set('Cookie', red.cookie).expect(200);
    expect(first.body.moves.map((move: { uci: string }) => move.uci)).toEqual(['b2e2', 'b7g7']);
    expect(first.body.nextCursor).toBe('1');
    const second = await request(app.getHttpServer()).get(`/api/v1/games/${gameId}/moves?cursor=${first.body.nextCursor}&limit=2`).set('Cookie', red.cookie).expect(200);
    expect(second.body.moves.map((move: { uci: string }) => move.uci)).toEqual(['e2c2', 'f9e8']);
    expect(second.body.nextCursor).toBeNull();
  });

  it('DATA-01: restricts resignation to players and records the right winner', async () => {
    const red = await makeUser('ResignRed');
    const black = await makeUser('ResignBlack');
    const third = await makeUser('ResignThird');
    const gameId = await makeGame(red.id, black.id);
    await request(app.getHttpServer()).post(`/api/v1/games/${gameId}/resign`).set('Cookie', third.cookie).expect(403);
    const response = await request(app.getHttpServer()).post(`/api/v1/games/${gameId}/resign`).set('Cookie', red.cookie).expect(201);
    expect(response.body).toMatchObject({ status: 'FINISHED', result: { winner: 'black', reason: 'RESIGNATION' } });
    expect(await games.submitMove(gameId, {
      color: 'black', moveId: `after-resign-${gameId}`, expectedVersion: 0, move: decodeMove('b7g7'),
    })).toMatchObject({ type: 'rejected', reason: 'GAME_NOT_ACTIVE' });
  });

  it('DATA-01: supports draw offer, acceptance, decline, and a fresh offer', async () => {
    const red = await makeUser('DrawRed');
    const black = await makeUser('DrawBlack');
    const acceptedGame = await makeGame(red.id, black.id);
    await request(app.getHttpServer()).post(`/api/v1/games/${acceptedGame}/draw-offer`).set('Cookie', red.cookie).send({ action: 'offer' }).expect(201);
    const accepted = await request(app.getHttpServer()).post(`/api/v1/games/${acceptedGame}/draw-offer`).set('Cookie', black.cookie).send({ action: 'accept' }).expect(201);
    expect(accepted.body).toMatchObject({ status: 'FINISHED', result: { winner: null, reason: 'DRAW_AGREEMENT' } });

    const declinedGame = await makeGame(red.id, black.id);
    await request(app.getHttpServer()).post(`/api/v1/games/${declinedGame}/draw-offer`).set('Cookie', red.cookie).send({ action: 'offer' }).expect(201);
    await request(app.getHttpServer()).post(`/api/v1/games/${declinedGame}/draw-offer`).set('Cookie', red.cookie).send({ action: 'offer' }).expect(409);
    const declined = await request(app.getHttpServer()).post(`/api/v1/games/${declinedGame}/draw-offer`).set('Cookie', black.cookie).send({ action: 'decline' }).expect(201);
    expect(declined.body.status).toBe('ACTIVE');
    await request(app.getHttpServer()).post(`/api/v1/games/${declinedGame}/draw-offer`).set('Cookie', red.cookie).send({ action: 'offer' }).expect(201);
  });

  it('DATA-01: lists only games involving the current user', async () => {
    const red = await makeUser('ListRed');
    const black = await makeUser('ListBlack');
    const other = await makeUser('ListOther');
    const mine = await makeGame(red.id, black.id);
    const theirs = await makeGame(other.id, black.id);
    const response = await request(app.getHttpServer()).get('/api/v1/me/games').set('Cookie', red.cookie).expect(200);
    expect(response.body.games.map((game: { gameId: string }) => game.gameId)).toContain(mine);
    expect(response.body.games.map((game: { gameId: string }) => game.gameId)).not.toContain(theirs);
  });
});
