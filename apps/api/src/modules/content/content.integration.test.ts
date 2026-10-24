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
import { ContentModule } from './content.module.js';

const sessions = new SessionsService(testPrisma as unknown as PrismaService);
const slug = `content-test-${Math.random().toString(36).slice(2)}`;
const puzzleId = `content-test-${Math.random().toString(36).slice(2)}`;
let userId: string;
let cookie: string;

describe('content REST endpoints', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ContentModule],
      providers: [ApiExceptionFilter],
    }).overrideProvider(PrismaService).useValue(testPrisma).compile();
    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.useGlobalFilters(app.get(ApiExceptionFilter));
    app.setGlobalPrefix('api/v1');
    await app.init();

    const session = await sessions.createGuest({ nickname: `ContentUser${Math.random()}` });
    userId = session.user.id;
    cookie = `${SESSION_COOKIE_NAME}=${session.rawToken}`;

    await testPrisma.lesson.create({
      data: {
        slug,
        title: 'Tướng đi thế nào?',
        level: 'BEGINNER',
        bodyJson: [{ fen: 'test-fen', caption: 'Đi thẳng', highlightSquares: ['a0', 'a1'] }],
      },
    });
    await testPrisma.puzzle.create({
      data: {
        id: puzzleId,
        title: 'Chiếu bí',
        objective: 'Chiếu hết trong một nước',
        difficulty: 2,
        initialFen: 'test-fen',
        sideToMove: 'RED',
        solutionJson: [['h2e2']],
        allowedAlternatives: [],
        hints: ['Nhìn vào hàng ngang'],
        source: 'integration-test',
      },
    });
  });

  afterAll(async () => {
    await app.close();
    if (userId) {
      await testPrisma.learningProgress.deleteMany({ where: { userId } });
      await testPrisma.guestSession.deleteMany({ where: { userId } });
      await testPrisma.user.deleteMany({ where: { id: userId } });
    }
    await testPrisma.lesson.deleteMany({ where: { slug } });
    await testPrisma.puzzle.deleteMany({ where: { id: puzzleId } });
    await testPrisma.$disconnect();
  });

  it('serves lesson summaries and validated detail from seeded rows', async () => {
    const list = await request(app.getHttpServer())
      .get('/api/v1/lessons').set('Cookie', cookie).expect(200);
    expect(list.body).toContainEqual({ slug, title: 'Tướng đi thế nào?', level: 'beginner' });

    const detail = await request(app.getHttpServer())
      .get(`/api/v1/lessons/${slug}`).set('Cookie', cookie).expect(200);
    expect(detail.body).toEqual({
      slug,
      title: 'Tướng đi thế nào?',
      level: 'beginner',
      steps: [{ fen: 'test-fen', caption: 'Đi thẳng', highlightSquares: ['a0', 'a1'] }],
    });
  });

  it('serves puzzle summaries and validated detail from seeded rows', async () => {
    const list = await request(app.getHttpServer())
      .get('/api/v1/puzzles').set('Cookie', cookie).expect(200);
    expect(list.body).toContainEqual({ id: puzzleId, title: 'Chiếu bí', difficulty: 2 });

    const detail = await request(app.getHttpServer())
      .get(`/api/v1/puzzles/${puzzleId}`).set('Cookie', cookie).expect(200);
    expect(detail.body).toEqual({
      id: puzzleId,
      title: 'Chiếu bí',
      difficulty: 2,
      objective: 'Chiếu hết trong một nước',
      initialFen: 'test-fen',
      sideToMove: 'red',
      solutionLines: [['h2e2']],
      allowedAlternatives: [],
      hints: ['Nhìn vào hàng ngang'],
      source: 'integration-test',
    });
  });

  it('returns 404 for missing lesson slugs and puzzle ids', async () => {
    await request(app.getHttpServer()).get('/api/v1/lessons/missing-content-test')
      .set('Cookie', cookie).expect(404);
    await request(app.getHttpServer()).get('/api/v1/puzzles/missing-content-test')
      .set('Cookie', cookie).expect(404);
  });

  it('increments attempts and keeps completed progress completed on a later miss', async () => {
    await request(app.getHttpServer()).post(`/api/v1/puzzles/${puzzleId}/attempts`)
      .set('Cookie', cookie).send({ completed: false, hintsUsed: 1 }).expect(201)
      .then(({ body }) => expect(body).toEqual({ status: 'in_progress', attempts: 1 }));
    await request(app.getHttpServer()).post(`/api/v1/puzzles/${puzzleId}/attempts`)
      .set('Cookie', cookie).send({ completed: true, hintsUsed: 1 }).expect(201)
      .then(({ body }) => expect(body).toEqual({ status: 'completed', attempts: 2 }));
    const completed = await testPrisma.learningProgress.findUniqueOrThrow({
      where: { userId_contentType_contentId: { userId, contentType: 'PUZZLE', contentId: puzzleId } },
    });
    expect(completed.status).toBe('COMPLETED');
    expect(completed.completedAt).toBeInstanceOf(Date);
    const completedAt = completed.completedAt;

    await request(app.getHttpServer()).post(`/api/v1/puzzles/${puzzleId}/attempts`)
      .set('Cookie', cookie).send({ completed: false, hintsUsed: 0 }).expect(201)
      .then(({ body }) => expect(body).toEqual({ status: 'completed', attempts: 3 }));
    const afterMiss = await testPrisma.learningProgress.findUniqueOrThrow({
      where: { userId_contentType_contentId: { userId, contentType: 'PUZZLE', contentId: puzzleId } },
    });
    expect(afterMiss.status).toBe('COMPLETED');
    expect(afterMiss.attempts).toBe(3);
    expect(afterMiss.completedAt).toEqual(completedAt);
  });
});
