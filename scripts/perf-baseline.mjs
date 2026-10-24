import { spawnSync } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

const API_BASE_URL = trimTrailingSlash(process.env.API_BASE_URL ?? 'http://localhost:3001/api/v1');
const WORKER_URL = trimTrailingSlash(process.env.WORKER_URL ?? 'http://localhost:4000');
const ROOM_SAMPLES = positiveInteger(process.env.ROOM_SAMPLES, 50);
const AI_SAMPLES = positiveInteger(process.env.AI_SAMPLES, 50);
const WORKER_CONTAINER = process.env.WORKER_CONTAINER ?? 'xq_pikafish_worker_dev';
const REPORT_PATH = 'docs/ops/perf-baseline.md';
const WORKER_FIELDS = ['totalRequests', 'totalTimeouts', 'totalErrors', 'totalRespawns', 'queueLength'];
const failures = [];
const roomCreateMs = [];
const roomJoinMs = [];
const aiMoveAcceptMs = [];

function trimTrailingSlash(value) {
  return value.replace(/\/+$/, '');
}

function positiveInteger(value, fallback) {
  if (value === undefined) return fallback;
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 1) throw new Error(`Expected a positive integer, got ${value}`);
  return number;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function percentile(samples, percentileValue) {
  if (samples.length === 0) return null;
  const sorted = [...samples].sort((a, b) => a - b);
  return Number(sorted[Math.ceil(percentileValue * sorted.length) - 1].toFixed(2));
}

function summary(samples) {
  return {
    count: samples.length,
    p50: percentile(samples, 0.5),
    p95: percentile(samples, 0.95),
    p99: percentile(samples, 0.99),
  };
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, { ...options, signal: AbortSignal.timeout(30_000) });
  const text = await response.text();
  let body;
  try {
    body = text.length > 0 ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!response.ok) throw new Error(`${options.method ?? 'GET'} ${url} returned HTTP ${response.status}: ${JSON.stringify(body)}`);
  return { body, response };
}

async function createGuest(nickname) {
  const { body, response } = await requestJson(`${API_BASE_URL}/sessions/guest`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ nickname }),
  });
  const setCookies = response.headers.getSetCookie?.() ?? [response.headers.get('set-cookie')].filter(Boolean);
  const cookie = setCookies.map((value) => value.split(';', 1)[0]).join('; ');
  if (!cookie) throw new Error('Guest session response did not include a session cookie');
  return { cookie, user: body };
}

async function timedRequest(url, cookie, method, body) {
  const start = performance.now();
  const result = await requestJson(url, {
    method,
    headers: { cookie, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { elapsedMs: performance.now() - start, body: result.body };
}

async function sampleWorkerMetrics() {
  const { body } = await requestJson(`${WORKER_URL}/metrics`);
  const metrics = {};
  for (const field of WORKER_FIELDS) {
    if (typeof body?.[field] !== 'number') throw new Error(`Worker /metrics is missing numeric field ${field}`);
    metrics[field] = body[field];
  }
  return metrics;
}

function dockerStats() {
  const result = spawnSync('docker', ['stats', '--no-stream', '--format', '{{.CPUPerc}}', WORKER_CONTAINER], {
    encoding: 'utf8',
    timeout: 10_000,
    windowsHide: true,
  });
  if (result.error || result.status !== 0) return { available: false, detail: result.error?.message ?? result.stderr.trim() };
  const cpuPercent = Number.parseFloat(result.stdout.trim().replace('%', ''));
  return Number.isFinite(cpuPercent)
    ? { available: true, cpuPercent }
    : { available: false, detail: `Could not parse docker stats output: ${result.stdout.trim()}` };
}

function recordFailure(operation, error) {
  failures.push({ operation, error: error instanceof Error ? error.message : String(error) });
}

async function measureRooms(host, guest) {
  for (let index = 0; index < ROOM_SAMPLES; index += 1) {
    if (index > 0 && index % 9 === 0) {
      // POST /rooms/:code/join is limited to 10 requests per minute per client IP.
      await delay(60_500);
    }
    try {
      const created = await timedRequest(`${API_BASE_URL}/rooms`, host.cookie, 'POST', {
        timeControl: { initialMs: 600_000, incrementMs: 0 },
        hostColor: 'red',
      });
      roomCreateMs.push(created.elapsedMs);
      const code = created.body?.code;
      if (typeof code !== 'string') throw new Error('POST /rooms response did not include room code');
      const joined = await timedRequest(`${API_BASE_URL}/rooms/${encodeURIComponent(code)}/join`, guest.cookie, 'POST', { nickname: 'Perf guest' });
      roomJoinMs.push(joined.elapsedMs);
    } catch (error) {
      recordFailure(`room sample ${index + 1}`, error);
    }
  }
}

async function measureAiEngineMoveAcceptances(session, beforeCpu) {
  const cpuSamples = [beforeCpu];
  const before = await sampleWorkerMetrics();
  const cpuTicker = setInterval(() => cpuSamples.push(dockerStats()), 1_000);

  try {
    // color=black makes AiService await the engine turn, including GamesService.submitMove.
    const requests = Array.from({ length: AI_SAMPLES }, async (_, index) => {
      try {
        const timed = await timedRequest(`${API_BASE_URL}/games/ai`, session.cookie, 'POST', {
          color: 'black',
          difficulty: process.env.AI_DIFFICULTY ?? 'easy',
        });
        aiMoveAcceptMs.push(timed.elapsedMs);
        return timed.body?.gameId;
      } catch (error) {
        recordFailure(`AI engine move sample ${index + 1}`, error);
        return null;
      }
    });
    const duringCpu = dockerStats();
    const gameIds = await Promise.all(requests);
    cpuSamples.push(duringCpu, dockerStats());
    const after = await sampleWorkerMetrics();
    const deltas = Object.fromEntries(WORKER_FIELDS.map((field) => [field, after[field] - before[field]]));
    return { before, after, deltas, cpuSamples, gameIds: gameIds.filter((id) => typeof id === 'string') };
  } finally {
    clearInterval(cpuTicker);
  }
}

function renderReport(result) {
  const lines = [
    '# Performance baseline',
    '',
    `- Run timestamp (UTC): ${result.timestamp}`,
    `- Exact command: \`${result.command}\``,
    `- API base URL: \`${API_BASE_URL}\``,
    `- Worker URL: \`${WORKER_URL}\``,
    `- Room samples requested: ${ROOM_SAMPLES}; AI engine move samples requested: ${AI_SAMPLES}.`,
    '',
    '## Room operations',
    '',
    '| Operation | Successful samples | p50 (ms) | p95 (ms) | p99 (ms) |',
    '|---|---:|---:|---:|---:|',
    `| POST /rooms | ${result.rooms.create.count} | ${value(result.rooms.create.p50)} | ${value(result.rooms.create.p95)} | ${value(result.rooms.create.p99)} |`,
    `| POST /rooms/:code/join | ${result.rooms.join.count} | ${value(result.rooms.join.p50)} | ${value(result.rooms.join.p95)} | ${value(result.rooms.join.p99)} |`,
    '',
    '## Move acceptance proxy',
    '',
    `POST /games/ai with \`color: "black"\` took ${result.aiMoveAccept.count} successful samples. The handler awaits Pikafish and the engine move submission before returning; latency percentiles: p50 ${value(result.aiMoveAccept.p50)} ms, p95 ${value(result.aiMoveAccept.p95)} ms, p99 ${value(result.aiMoveAccept.p99)} ms. This captures an AI engine move acceptance round trip, not a human \`game:move\` submission. There is no REST move submission endpoint; human move acceptance is Socket.IO only.`,
    '',
    '## Reconnect',
    '',
    'Quantitative reconnect rate and resync latency: not measured by this Node script. Reconnect uses the browser client Socket.IO path. The qualitative recovery scenario is covered by `apps/web/e2e/multiplayer.spec.ts`, “a dropped connection recovers and the player can move again.” A browser-driven repeated-cycle measurement remains a separate gap.',
    '',
    '## Pikafish worker metrics and CPU',
    '',
    '| /metrics field | Before | After | Delta |',
    '|---|---:|---:|---:|',
    ...WORKER_FIELDS.map((field) => `| ${field} | ${result.worker.before[field]} | ${result.worker.after[field]} | ${result.worker.deltas[field]} |`),
    '',
    `Docker worker container: \`${WORKER_CONTAINER}\`. CPU samples (before, during, after, plus 1-second samples when available): ${result.worker.cpuSamples.map((sample) => sample.available ? `${sample.cpuPercent}%` : 'unavailable').join(', ')}.`,
    '',
    '## Run details',
    '',
    `- AI engine move samples completed: ${result.aiMoveAccept.count}/${AI_SAMPLES}.`,
    `- Room create/join samples completed: ${result.rooms.join.count}/${ROOM_SAMPLES}.`,
    `- Failures: ${result.failures.length === 0 ? 'none' : result.failures.map(({ operation, error }) => `${operation}: ${error}`).join('; ')}`,
    '- No SLA, pass/fail threshold, or latency budget is defined by this baseline.',
    '',
  ];
  return lines.join('\n');
}

function value(number) {
  return number === null ? 'n/a' : number.toFixed(2);
}

async function main() {
  const startedAt = new Date();
  const host = await createGuest('Perf host');
  const guest = await createGuest('Perf guest');
  const beforeCpu = dockerStats();
  await measureRooms(host, guest);
  const worker = await measureAiEngineMoveAcceptances(host, beforeCpu);
  const result = {
    timestamp: startedAt.toISOString(),
    command: 'node scripts/perf-baseline.mjs',
    rooms: { create: summary(roomCreateMs), join: summary(roomJoinMs) },
    aiMoveAccept: summary(aiMoveAcceptMs),
    worker,
    failures,
  };
  const report = renderReport(result);
  await mkdir(dirname(REPORT_PATH), { recursive: true });
  await writeFile(REPORT_PATH, report, 'utf8');
  process.stdout.write(`${report}\n`);
}

main().catch((error) => {
  process.stderr.write(`Performance baseline could not complete: ${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
