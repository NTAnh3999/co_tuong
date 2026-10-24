export const packageName = '@xq/pikafish-worker' as const;
export * from './uci/index.js';
export * from './difficulty.js';
export * from './pool.js';
export * from './server.js';

import { EnginePool } from './pool.js';
import { createWorkerServer } from './server.js';

async function main(): Promise<void> {
  const path = process.env.PIKAFISH_PATH;
  if (!path) throw new Error('PIKAFISH_PATH is required to start the Pikafish worker');
  const port = Number(process.env.PORT ?? 4000);
  const pool = new EnginePool(path, Number(process.env.POOL_SIZE ?? 2), Number(process.env.QUEUE_CAP ?? 20));
  await pool.start();
  const server = createWorkerServer(pool);
  server.listen(port, () => process.stdout.write(`Pikafish worker listening on ${port}\n`));
  const shutdown = () => { server.close(); void pool.close(); };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

if (process.argv[1]?.replaceAll('\\', '/').endsWith('/dist/index.js')) {
  void main().catch((error: unknown) => { process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`); process.exitCode = 1; });
}
