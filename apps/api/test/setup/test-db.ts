import { PrismaClient } from '@prisma/client';

function getTestDatabaseUrl(): string {
  const databaseUrl = process.env.DATABASE_URL_TEST;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL_TEST must be set before creating the test Prisma client.');
  }

  const parsed = new URL(databaseUrl);
  const databaseName = decodeURIComponent(parsed.pathname.replace(/^\//, ''));
  if (!['postgres:', 'postgresql:'].includes(parsed.protocol) || databaseName !== 'xq_test') {
    throw new Error('The test Prisma client can connect only to xq_test.');
  }

  return databaseUrl;
}

export const testPrisma = new PrismaClient({
  datasources: { db: { url: getTestDatabaseUrl() } },
});
