import { createHash } from 'node:crypto';
import type { UserSummary } from '@xq/shared-contracts';
import type { PrismaService } from '../../prisma/prisma.service';

export const SESSION_COOKIE_NAME = 'xq_sid';
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

interface GuestSessionWithUser {
  user: { id: string; nickname: string; type: 'GUEST' | 'REGISTERED' };
  expiresAt: Date;
}

function hashToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex');
}

async function resolveRawToken(rawToken: string, prisma: PrismaService): Promise<UserSummary | null> {
  const tokenHash = hashToken(rawToken);
  const session = await prisma.guestSession.findUnique({
    where: { tokenHash },
    include: { user: true },
  }) as GuestSessionWithUser | null;

  const now = new Date();
  if (!session || session.expiresAt.getTime() < now.getTime()) return null;

  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);
  await prisma.guestSession.update({ where: { tokenHash }, data: { expiresAt } });
  return {
    id: session.user.id,
    nickname: session.user.nickname,
    type: session.user.type === 'GUEST' ? 'guest' : 'registered',
  };
}

function readCookie(cookieHeader: string | undefined): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(';')) {
    const separator = part.indexOf('=');
    if (separator < 0 || part.slice(0, separator).trim() !== SESSION_COOKIE_NAME) continue;
    const value = part.slice(separator + 1).trim();
    if (!value) return null;
    try {
      return decodeURIComponent(value);
    } catch {
      return null;
    }
  }
  return null;
}

export async function resolveSessionFromCookieHeader(
  cookieHeader: string | undefined,
  prisma: PrismaService,
): Promise<UserSummary | null> {
  const rawToken = readCookie(cookieHeader);
  return rawToken ? resolveRawToken(rawToken, prisma) : null;
}

export async function resolveSessionFromToken(
  rawToken: unknown,
  prisma: PrismaService,
): Promise<UserSummary | null> {
  if (typeof rawToken !== 'string' || rawToken.length === 0) return null;
  return resolveRawToken(rawToken, prisma);
}
