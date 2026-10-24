import { createServer, type Server } from 'node:http';
import { z } from 'zod';
import { EnginePool, EngineTimeoutError, QueueFullError } from './pool.js';

const requestSchema = z.object({ fen: z.string().optional(), moves: z.array(z.string()).optional(), difficulty: z.enum(['easy', 'medium', 'hard']) }).strict();
export function createWorkerServer(pool: EnginePool): Server {
  return createServer(async (request, response) => {
    const json = (status: number, body: unknown) => { response.writeHead(status, { 'content-type': 'application/json' }); response.end(JSON.stringify(body)); };
    if (request.method === 'GET' && request.url === '/health') { json(200, { status: 'ok', poolSize: pool.poolSize, idleEngines: pool.idleEngines, queueLength: pool.queueLength }); return; }
    if (request.method === 'GET' && request.url === '/metrics') { json(200, { ...pool.stats, poolSize: pool.poolSize, queueLength: pool.queueLength }); return; }
    if (request.method !== 'POST' || request.url !== '/bestmove') { json(404, { error: { code: 'NOT_FOUND', message: 'Not found' } }); return; }
    try {
      const chunks: Buffer[] = [];
      for await (const chunk of request) chunks.push(Buffer.from(chunk));
      const parsed = requestSchema.safeParse(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      if (!parsed.success) { json(400, { error: { code: 'INVALID_REQUEST', message: 'Request body is invalid' } }); return; }
      const line = await pool.submit(parsed.data, parsed.data.difficulty);
      json(200, { move: line.move, scoreCp: line.scoreCp });
    } catch (error) {
      if (error instanceof SyntaxError) { json(400, { error: { code: 'INVALID_REQUEST', message: 'Request body must be valid JSON' } }); return; }
      if (error instanceof QueueFullError) { json(503, { error: { code: 'QUEUE_FULL', message: error.message } }); return; }
      if (error instanceof EngineTimeoutError) { json(504, { error: { code: 'ENGINE_TIMEOUT', message: error.message } }); return; }
      json(500, { error: { code: 'ENGINE_ERROR', message: error instanceof Error ? error.message : 'Engine error' } });
    }
  });
}
