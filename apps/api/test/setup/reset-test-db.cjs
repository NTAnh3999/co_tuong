const { execFileSync } = require('node:child_process');
const path = require('node:path');

function getTestDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL_TEST;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL_TEST must be set before resetting the test database.');
  }

  let parsed;
  try {
    parsed = new URL(databaseUrl);
  } catch {
    throw new Error('DATABASE_URL_TEST must be a valid PostgreSQL URL.');
  }

  const databaseName = decodeURIComponent(parsed.pathname.replace(/^\//, ''));
  if (!['postgres:', 'postgresql:'].includes(parsed.protocol) || databaseName !== 'xq_test') {
    throw new Error('Refusing to reset a database other than xq_test.');
  }

  return databaseUrl;
}

function resetTestDatabase() {
  const databaseUrl = getTestDatabaseUrl();
  const apiRoot = path.resolve(__dirname, '../..');
  const command = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';

  execFileSync(
    command,
    [
      'exec',
      'prisma',
      'migrate',
      'reset',
      '--force',
      '--skip-generate',
      '--skip-seed',
      '--schema=./prisma/schema.prisma',
    ],
    {
      cwd: apiRoot,
      env: { ...process.env, DATABASE_URL: databaseUrl },
      stdio: 'inherit',
      shell: process.platform === 'win32',
    },
  );
}

module.exports = { getTestDatabaseUrl, resetTestDatabase };

if (require.main === module) {
  resetTestDatabase();
}
