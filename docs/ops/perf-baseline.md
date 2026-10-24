# Performance baseline

- Run timestamp (UTC): 2026-10-24T20:38:18.571Z
- Exact command: `node scripts/perf-baseline.mjs`
- API base URL: `http://localhost:3001/api/v1`
- Worker URL: `http://localhost:4000`
- Room samples requested: 50; AI engine move samples requested: 50.

## Room operations

| Operation | Successful samples | p50 (ms) | p95 (ms) | p99 (ms) |
|---|---:|---:|---:|---:|
| POST /rooms | 50 | 24.93 | 40.56 | 56.14 |
| POST /rooms/:code/join | 48 | 63.15 | 75.23 | 87.63 |

## Move acceptance proxy

POST /games/ai with `color: "black"` took 50 successful samples. The handler awaits Pikafish and the engine move submission before returning; latency percentiles: p50 7141.85 ms, p95 7151.73 ms, p99 7153.75 ms. This captures an AI engine move acceptance round trip, not a human `game:move` submission. There is no REST move submission endpoint; human move acceptance is Socket.IO only.

## Reconnect

Quantitative reconnect rate and resync latency: not measured by this Node script. Reconnect uses the browser client Socket.IO path. The qualitative recovery scenario is covered by `apps/web/e2e/multiplayer.spec.ts`, “a dropped connection recovers and the player can move again.” A browser-driven repeated-cycle measurement remains a separate gap.

## Pikafish worker metrics and CPU

| /metrics field | Before | After | Delta |
|---|---:|---:|---:|
| totalRequests | 3 | 53 | 50 |
| totalTimeouts | 0 | 0 | 0 |
| totalErrors | 0 | 20 | 20 |
| totalRespawns | 0 | 0 | 0 |
| queueLength | 0 | 0 | 0 |

Docker worker container: `xq_pikafish_worker_dev`. CPU samples (before, during, after, plus 1-second samples when available): 8.19%, 0%, 0.08%, 29.12%, 0.02%, 1.49%, 0%, 0.02%, 0%.

## Run details

- AI engine move samples completed: 50/50.
- Room create/join samples completed: 48/50.
- Failures: room sample 8: POST http://localhost:3001/api/v1/rooms/WYB8YE7B/join returned HTTP 429: {"error":{"code":"TOO_MANY_REQUESTS","message":"ThrottlerException: Too Many Requests"}}; room sample 9: POST http://localhost:3001/api/v1/rooms/2348MVBE/join returned HTTP 429: {"error":{"code":"TOO_MANY_REQUESTS","message":"ThrottlerException: Too Many Requests"}}
- No SLA, pass/fail threshold, or latency budget is defined by this baseline.
