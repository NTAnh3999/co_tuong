# Alerting Reference

What to alert on, grounded in the code that exists today. Each entry names the real endpoint, metric field, or log message. Verify exact log text in a live log before wiring an alert rule (see "Verification" at the end).

## 1. Pikafish worker (`services/pikafish-worker`)

### 1a. Worker unreachable / unhealthy

- Source: `GET /health` on port 4000 (`services/pikafish-worker/src/server.ts`). Returns `200 {"status":"ok","poolSize","idleEngines","queueLength"}` while the process is up.
- The compose healthcheck (`infrastructure/docker/docker-compose.dev.yml`) marks the container unhealthy when `/health` returns non-200 or the connection errors, after 5 retries at 10s.
- **Alert:** `/health` non-200 or connection refused for 3 consecutive checks (30 s).
- **Caveat:** `/health` returns 200 whenever the Node process is alive, even if every engine process is dead. It detects a down worker, not a degraded one. Use 1b/1c for degradation.

### 1b. Engine queue filling up

- Source: `queueLength` in `/health` and `/metrics`. The cap is the `QUEUE_CAP` env var (default 20; dev compose sets 20).
- A full queue makes `POST /bestmove` return `503 {"error":{"code":"QUEUE_FULL"}}`. The API then takes the fallback path (see section 2).
- **Alert (warning):** `queueLength >= 0.5 * QUEUE_CAP` for 2 minutes.
- **Alert (critical):** `queueLength >= QUEUE_CAP` at any sample, or `totalErrors` increasing while `queueLength` is at cap.

### 1c. Engine errors, timeouts, and respawns

Source: `GET /metrics` (`services/pikafish-worker/src/server.ts`, fields from `PoolStats` in `services/pikafish-worker/src/pool.ts`):

| Field | Meaning | Alert |
|---|---|---|
| `totalRequests` | All submitted searches | Baseline only |
| `totalTimeouts` | Search exceeded its hard timeout; returned `504 ENGINE_TIMEOUT` | Any increase sustained over 5 min |
| `totalErrors` | Searches that rejected (includes `QUEUE_FULL` rejections, timeouts, and engine errors) | Rate > 5 per 5 min |
| `totalRespawns` | An engine process was replaced after a failure | Any increase (engine is crashing) |

Note that `totalErrors` also counts timeouts, so one timeout raises it twice.

## 2. API AI fallback path (`apps/api/src/modules/ai/ai.service.ts`)

When the worker fails, `AiService` does not stop the game. It plays a capture-preferring random legal move (`fallbackMove`). Games keep working, so this is **silent to users**. Frequent fallback use means the worker is degraded even though play looks normal.

Logger context: `AiService` (NestJS `Logger`). Each entry is a `WARN` (or `ERROR`) line containing the game id.

| Log message (substring) | Level | Meaning | Alert |
|---|---|---|---|
| `Pikafish request failed for game` ... `choosing a legal fallback move` | WARN | Worker call threw: unreachable, 503 `QUEUE_FULL`, 504 `ENGINE_TIMEOUT`, or 500 | Count > 5 in 10 min (warning); > 20 in 10 min (critical) |
| `Worker returned an illegal move for game` | WARN | Worker answered with a move the rules engine rejects | Any occurrence (worker or FEN/move mismatch) |
| `Engine move rejected for game` | WARN | Engine move rejected for a non-illegal reason (e.g. stale version); no fallback is played | Count > 5 in 10 min |
| `Fallback engine move rejected for game` | WARN | Even the fallback move was rejected | Any occurrence |
| `Could not process engine turn for game` | ERROR | Unexpected exception in the AI turn | Any occurrence |

The first row is the main degradation signal. Compare its rate to total AI turns before tuning thresholds.

## 3. API request and error logs

- `Http` logger (`apps/api/src/common/middleware/request-logging.middleware.ts`): one JSON line per request with `requestId`, `method`, `path`, `statusCode`, `durationMs`.
  - **Alert:** `statusCode >= 500` rate > 1% over 5 min.
  - **Alert:** p95 `durationMs` above your agreed budget (no budget is defined in the repo yet).
- `ApiExceptionFilter` (`apps/api/src/common/filters/api-exception.filter.ts`): unhandled errors log a JSON `ERROR` line with `requestId`, `method`, `path`, `error.name`, `error.message`.
  - **Alert:** any `ERROR` line whose `error.name` is a Prisma error (for example `PrismaClientInitializationError`, `PrismaClientKnownRequestError`) — these usually mean the database is unreachable or misconfigured.

## 4. Postgres

- No application-level metric exists in the repo yet. Use the infrastructure's own monitoring for connection counts and availability.
- Existing signal: the compose healthcheck runs `pg_isready -U xq` every 10 s. Non-zero exit = Postgres not accepting connections.
- **Alert:** `pg_isready` failing for 3 consecutive checks.
- **Alert:** `ApiExceptionFilter` ERROR lines with Prisma connection errors (see section 3). Prisma's standard connection error codes are `P1001` (can't reach database server) and `P1017` (server closed the connection); confirm the exact text in logs before matching.
- Backups: alert when `backup.sh` exits non-zero (its stderr starts with `backup.sh: ERROR:`), or when the newest `xq-*.dump` in the backup directory is older than the backup cadence (see `docs/ops/backup-restore-runbook.md`).

## Verification

Before turning a row into a live rule:

1. Hit `GET /health` and `GET /metrics` on a running worker (`docker compose -f infrastructure/docker/docker-compose.dev.yml up -d pikafish-worker`) and confirm the field names.
2. Stop the worker and play an AI move: confirm the `Pikafish request failed for game ...` line appears in the API log.
3. Confirm Prisma connection error text by stopping Postgres briefly in a dev environment.

## Known gaps

- No Prometheus or metrics exporter exists in the repo; the worker exposes JSON only. Alerts above assume a poller (or log-based rules) outside this repo.
- The API has no metrics endpoint; AI and request signals are log-based only.
- No latency or capacity budgets are defined yet; thresholds are starting points.
