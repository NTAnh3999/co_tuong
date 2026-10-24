import 'reflect-metadata';
import { createHash } from 'node:crypto';
import cookieParser from 'cookie-parser';
import { Test } from '@nestjs/testing';
import { ApiExceptionFilter } from '../../common/filters/api-exception.filter';
import { PrismaModule } from '../../prisma/prisma.module';
import { PrismaService } from '../../prisma/prisma.service';
import { testPrisma } from '../../../test/setup/test-db.js';
import { resolveSessionFromCookieHeader, SESSION_COOKIE_NAME, SESSION_TTL_MS } from './session-identity';
import { SessionsModule } from './sessions.module';
import { SessionsService } from './sessions.service';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';

const appUsers: string[] = [];
const service = new SessionsService(testPrisma as unknown as PrismaService);

async function makeSession(nickname: string) {
  const created = await service.createGuest({ nickname });
  appUsers.push(created.user.id);
  return created;
}

describe('guest sessions (ROOM-02)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [PrismaModule, SessionsModule],
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
    if (appUsers.length) {
      await testPrisma.guestSession.deleteMany({ where: { userId: { in: appUsers } } });
      await testPrisma.user.deleteMany({ where: { id: { in: appUsers } } });
    }
    await testPrisma.$disconnect();
  });

  it('ROOM-02: creates a guest, sets the opaque session cookie, and stores only its hash', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/sessions/guest')
      .send({ nickname: 'Phao' })
      .expect(201);
    appUsers.push(response.body.id as string);

    expect(response.body).toMatchObject({ id: expect.any(String), nickname: 'Phao', type: 'guest' });
    const cookieHeader = response.headers['set-cookie'];
    const cookieValues = Array.isArray(cookieHeader) ? cookieHeader : cookieHeader ? [cookieHeader] : [];
    // Cookie attribute order (Max-Age vs Path vs Expires) is an Express/cookie-parser
    // implementation detail, not something to assert on — just check the token itself.
    expect(cookieValues).toEqual(expect.arrayContaining([
      expect.stringMatching(/^xq_sid=[A-Za-z0-9_-]{43};/),
    ]));
    const setCookie = cookieValues.find((value) => value.startsWith(`${SESSION_COOKIE_NAME}=`));
    expect(setCookie).toBeDefined();
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('SameSite=Lax');
    expect(setCookie).toContain('Max-Age=2592000');
    const rawToken = setCookie!.slice(`${SESSION_COOKIE_NAME}=`.length).split(';')[0]!;
    const row = await testPrisma.guestSession.findUniqueOrThrow({ where: { userId: response.body.id as string } });
    expect(row.tokenHash).toBe(createHash('sha256').update(rawToken).digest('hex'));
    expect(row.tokenHash).not.toBe(rawToken);
  });

  it('ROOM-02: returns the API error envelope when /me has no cookie', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/me').expect(401);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
    expect(response.body.error.message).toBeTruthy();
  });

  it('ROOM-02: rejects a forged cookie', async () => {
    await request(app.getHttpServer()).get('/api/v1/me').set('Cookie', `${SESSION_COOKIE_NAME}=not-a-session`).expect(401);
  });

  it('ROOM-02: rejects an expired guest session', async () => {
    const created = await makeSession('HetHan');
    await testPrisma.guestSession.update({
      where: { userId: created.user.id },
      data: { expiresAt: new Date(Date.now() - 1_000) },
    });
    await request(app.getHttpServer()).get('/api/v1/me').set('Cookie', `${SESSION_COOKIE_NAME}=${created.rawToken}`).expect(401);
  });

  it('ROOM-02: authenticates the current user and extends the stored expiry', async () => {
    const created = await makeSession('MaTuong');
    const before = await testPrisma.guestSession.findUniqueOrThrow({ where: { userId: created.user.id } });
    const response = await request(app.getHttpServer())
      .get('/api/v1/me')
      .set('Cookie', `${SESSION_COOKIE_NAME}=${created.rawToken}`)
      .expect(200);
    const after = await testPrisma.guestSession.findUniqueOrThrow({ where: { userId: created.user.id } });
    expect(response.body).toEqual(created.user);
    expect(after.expiresAt.getTime()).toBeGreaterThan(before.expiresAt.getTime());
    expect(after.expiresAt.getTime()).toBeGreaterThanOrEqual(Date.now() + SESSION_TTL_MS - 2_000);
  });

  it('ROOM-02: updates a nickname and returns it on a subsequent /me request', async () => {
    const created = await makeSession('Tot');
    const cookie = `${SESSION_COOKIE_NAME}=${created.rawToken}`;
    await request(app.getHttpServer()).patch('/api/v1/me').set('Cookie', cookie).send({ nickname: 'Xe' })
      .expect(200).expect(({ body }) => expect(body.nickname).toBe('Xe'));
    await request(app.getHttpServer()).get('/api/v1/me').set('Cookie', cookie)
      .expect(200).expect(({ body }) => expect(body).toMatchObject({ id: created.user.id, nickname: 'Xe', type: 'guest' }));
  });

  it('ROOM-02: resolves multi-cookie headers and returns null for missing, invalid, and expired sessions', async () => {
    const created = await makeSession('Resolver');
    expect(await resolveSessionFromCookieHeader(`other=1; ${SESSION_COOKIE_NAME}=${created.rawToken}; another=2`, testPrisma as unknown as PrismaService))
      .toEqual(created.user);
    expect(await resolveSessionFromCookieHeader('other=1; another=2', testPrisma as unknown as PrismaService)).toBeNull();
    expect(await resolveSessionFromCookieHeader(`${SESSION_COOKIE_NAME}=random`, testPrisma as unknown as PrismaService)).toBeNull();

    const expired = await makeSession('ResolverExpired');
    await testPrisma.guestSession.update({ where: { userId: expired.user.id }, data: { expiresAt: new Date(Date.now() - 1) } });
    expect(await resolveSessionFromCookieHeader(`${SESSION_COOKIE_NAME}=${expired.rawToken}`, testPrisma as unknown as PrismaService)).toBeNull();
  });

  it('ROOM-02: throttles guest session creation at the configured request limit', async () => {
    const results = await Promise.all(Array.from({ length: 12 }, (_, index) =>
      request(app.getHttpServer()).post('/api/v1/sessions/guest').send({ nickname: `Throttle${index}` })),
    );
    for (const response of results) {
      if (response.status === 201) appUsers.push(response.body.id as string);
    }
    expect(results.some(({ status }) => status === 429)).toBe(true);
  });
});
