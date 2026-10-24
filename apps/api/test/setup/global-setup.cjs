const path = require('node:path');
const { resetTestDatabase } = require('./reset-test-db.cjs');

module.exports = async function globalSetup() {
  // Node 22 native .env loader — makes DATABASE_URL_TEST available without a
  // dotenv dependency. A plain .cjs file (not part of the tsc project), so
  // __dirname/require are unambiguous here regardless of apps/api's module target.
  try {
    process.loadEnvFile(path.join(__dirname, '../../.env'));
  } catch {
    // no .env file present — rely on whatever the environment already provides
  }
  resetTestDatabase();
};
