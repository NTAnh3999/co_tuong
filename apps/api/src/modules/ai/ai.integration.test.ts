import 'reflect-metadata';
import cookieParser from 'cookie-parser';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { applyMove, decodeMove, fromFen, getAllLegalMoves, squareToIndex } from '@xq/xiangqi-core';
import { ApiExceptionFilter } from '../../common/filters/api-exception.filter.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { testPrisma } from '../../../test/setup/test-db.js';
import { SESSION_COOKIE_NAME } from '../sessions/session-identity.js';
import { SessionsService } from '../sessions/sessions.service.js';
import { GamesService } from '../games/games.service.js';
import { AiModule } from './ai.module.js';
import { AiService } from './ai.service.js';

const sessions = new SessionsService(testPrisma as unknown as PrismaService);
const games = new GamesService(testPrisma as unknown as PrismaService);
const ai = new AiService(testPrisma as unknown as PrismaService, games);
const ownedGames: string[] = [];
const ownedUsers: string[] = [];
let app: INestApplication;

async function makeUser(nickname: string) {
  const created = await sessions.createGuest({ nickname });
  ownedUsers.push(created.user.id);
  return { user: created.user, cookie: `${SESSION_COOKIE_NAME}=${created.rawToken}` };
}

async function makeAiGame(redId: string | null, blackId: string | null, fen?: string) {
  const { gameId } = await games.createGame(fen ?? 'rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w - - 0 1', null, redId, blackId);
  ownedGames.push(gameId);
  await testPrisma.game.update({ where: { id: gameId }, data: { mode: 'AI' } });
  await testPrisma.$executeRaw`UPDATE "Game" SET "aiDifficulty" = 'EASY'::"AiDifficulty" WHERE "id" = ${gameId}`;
  await games.activateGame(gameId);
  return gameId;
}

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({
    imports: [AiModule],
    providers: [ApiExceptionFilter],
  }).overrideProvider(PrismaService).useValue(testPrisma).compile();
  app = moduleRef.createNestApplication();
  app.use(cookieParser());
  app.useGlobalFilters(app.get(ApiExceptionFilter));
  app.setGlobalPrefix('api/v1');
  await app.init();
});

afterAll(async () => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  await app.close();
  if (ownedGames.length) {
    await testPrisma.gameMove.deleteMany({ where: { gameId: { in: ownedGames } } });
    await testPrisma.gameSnapshot.deleteMany({ where: { gameId: { in: ownedGames } } });
    await testPrisma.game.deleteMany({ where: { id: { in: ownedGames } } });
  }
  if (ownedUsers.length) {
    await testPrisma.guestSession.deleteMany({ where: { userId: { in: ownedUsers } } });
    await testPrisma.user.deleteMany({ where: { id: { in: ownedUsers } } });
  }
  await testPrisma.$disconnect();
});

describe('AI games (AI-01)', () => {
  it('creates an untimed AI game and immediately moves when the human is black', async () => {
    const human = await makeUser('AiBlackHuman');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ move: 'a3a4', scoreCp: 0 }), { status: 200 })));

    const { gameId } = await ai.createAiGame(human.user.id, 'black', 'easy');
    ownedGames.push(gameId);
    const snapshot = await games.getSnapshot(gameId);

    expect(snapshot.status).toBe('ACTIVE');
    expect(snapshot.clocks).toBeNull();
    expect(snapshot.moves).toEqual(['a3a4']);
    expect(await testPrisma.game.findUniqueOrThrow({ where: { id: gameId } })).toMatchObject({
      mode: 'AI', aiDifficulty: 'EASY', redId: null, blackId: human.user.id,
    });
    expect(fetch).toHaveBeenCalledOnce();
  });

  it('ignores regular games and AI games when it is the human turn', async () => {
    const human = await makeUser('AiHumanTurn');
    const regular = await games.createGame('rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w - - 0 1', null, human.user.id, null);
    ownedGames.push(regular.gameId);
    const aiGame = await makeAiGame(human.user.id, null);
    const mockedFetch = vi.fn();
    vi.stubGlobal('fetch', mockedFetch);

    await ai.onGameUpdated({ gameId: regular.gameId });
    await ai.onGameUpdated({ gameId: aiGame });

    expect(mockedFetch).not.toHaveBeenCalled();
  });

  it('submits the worker move through GamesService when the engine is to move', async () => {
    const human = await makeUser('AiWorkerTurn');
    const gameId = await makeAiGame(human.user.id, null);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ move: 'a6a5', scoreCp: 12 }), { status: 200 })));
    expect((await games.submitMove(gameId, { color: 'red', moveId: `human-${gameId}`, expectedVersion: 0, move: decodeMove('a3a4') })).type).toBe('accepted');

    await ai.onGameUpdated({ gameId });

    expect((await games.getSnapshot(gameId)).moves).toEqual(['a3a4', 'a6a5']);
  });

  it('uses a legal fallback after fetch fails and prefers a legal capture', async () => {
    const human = await makeUser('AiFallback');
    // Red king sits off the e-file so it doesn't face the black king directly
    // (that "flying general" exposure would make every move except blocking
    // the e-file illegal, hiding the rook's a4a6 capture entirely).
    const captureFen = '4k4/9/9/p8/9/R8/9/9/9/3K5 w - - 0 1';
    const gameId = await makeAiGame(null, human.user.id, captureFen);
    const position = fromFen(captureFen);
    const legal = getAllLegalMoves(position, 'red');
    const capture = legal.find((move) => position.board[squareToIndex(move.to)] !== null);
    expect(capture).toBeDefined();
    expect(legal.some((move) => position.board[squareToIndex(move.to)] === null)).toBe(true);
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('worker unavailable')));
    vi.spyOn(Math, 'random').mockReturnValue(0);

    await ai.onGameUpdated({ gameId });

    const snapshot = await games.getSnapshot(gameId);
    expect(snapshot.moves).toHaveLength(1);
    const move = decodeMove(snapshot.moves[0]!);
    expect(legal).toContainEqual(move);
    expect(move).toEqual(capture);
    expect(applyMove(position, move).board[squareToIndex(move.to)]?.color).toBe('red');
  });

  it('POST /games/ai creates and returns an AI game id', async () => {
    const human = await makeUser('AiApiUser');
    const response = await request(app.getHttpServer())
      .post('/api/v1/games/ai')
      .set('Cookie', human.cookie)
      .send({ color: 'red', difficulty: 'medium' })
      .expect(201);
    ownedGames.push(response.body.gameId as string);
    expect(response.body).toMatchObject({ gameId: expect.any(String) });
    expect(await testPrisma.game.findUniqueOrThrow({ where: { id: response.body.gameId as string } })).toMatchObject({
      status: 'ACTIVE', mode: 'AI', aiDifficulty: 'MEDIUM', initialMs: null, incrementMs: null,
    });
  });
});
