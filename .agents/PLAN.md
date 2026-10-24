# Xiangqi Learn & Play — Execution Plan (M0–M7)

## Context

`D:\Workspace\Co_Tuong` currently contains only `Docs/` — a baseline v1.0.0 spec (PRD, UX/sitemap, technical architecture, MVP roadmap/QA, ADR register, references) for a brand-new Xiangqi (Cờ Tướng) web platform: Next.js + NestJS + Socket.IO + PostgreSQL, a pure-TypeScript `xiangqi-core` rules engine, Pikafish AI, 2D-first board (3D explicitly deferred past MVP). There is no code yet — this plan takes the project from empty folder to a beta-ready MVP (milestones M0–M7 from `04_MVP_Roadmap_QA.md`; M8/3D is out of scope here).

Per the user's instruction, this plan was designed by an **Opus 5.5 (High)** planning agent, and execution is carried out by dispatching work to two executors instead of writing all the code directly:
- **Codex CLI** running **GPT-6 Luna (High reasoning)** — default in `~/.codex/config.toml` on this machine — for ~**70%** of implementation effort (spec-clear, self-contained coding: the rules engine, API/DB, Socket.IO, Next.js pages, Pikafish worker, most tests).
- **Claude Haiku 4.5 (High)** via the Agent tool for ~**30%** — note "Haiku 5.5" does not exist; 4.5 is the latest available. Handles narrower, pattern-following work: boilerplate, additional test cases from an established pattern, small UI components, docs, config.

Sonnet 5 (orchestrator) dispatches tasks, reviews diffs/scope, runs gates (lint/typecheck/test), resolves integration issues, and decides when each milestone's exit criteria are met.

(Note: original pre-flight findings below reflect state *before* T0.0 was executed. See `.agents/NOTES.md` for what was actually done and environment quirks discovered during execution — Node was upgraded to 22, pnpm installed, Codex reinstalled, sandbox dot-directory restriction found, etc.)

## Pre-flight (before any task dispatch)

Verified on this machine:
| Finding | Action |
|---|---|
| Node v20.11.1 (EOL/too old for current Prisma & Vitest majors) | Ask you to install Node 22 or 24 LTS; pin via `.nvmrc` + `engines` |
| **pnpm not installed** | `corepack enable && corepack prepare pnpm@latest --activate` (or `npm i -g pnpm`) |
| Not a git repo | `git init`; commit after every accepted task, per-milestone branches |
| Folder is `Docs/`, target tree wants `docs/` (Windows case-insensitive) | Rename `Docs`→`docs_tmp`→`docs`; move spec to `docs/spec/v1.0/`; repo root = `xiangqi-platform` package at `D:\Workspace\Co_Tuong` |
| Codex CLI 0.39.0 confirmed, supports `exec`, `-s/--sandbox`, `-C/--cd`, `--json`, `--output-last-message`, stdin prompts, `exec resume` | Confirms dispatch pattern below |
| Docker 29.8, git 2.35 present | Fine for Postgres dev/test via compose |

## Resolved defaults for blocking decisions (new ADR-017 through ADR-025)

The docs flag several "CHƯA CHỐT" (undecided) items as blocking M1/release. To avoid stalling, these are recorded as **Proposed** ADRs; they need user confirmation before the M7 release gate, not before starting work.

- **ADR-017 RuleSet `xq-casual-1.0.0`** (resolves Q-001): no-legal-moves-loses (not a draw); repetition via 2-field FEN key — 3rd occurrence checks whether exactly one side gave check every intervening ply (that side loses, `PERPETUAL_CHECK`) vs. draw otherwise; 120-ply no-capture limit (`MOVE_LIMIT`, matches Pikafish's rule60); insufficient-material draw when neither side has Chariot/Horse/Cannon/Soldier; resignation/draw-agreement/timeout/abandonment/abort as terminal events. **Perpetual chase is explicitly NOT implemented** (treated as a draw) — documented simplification; UI must show a casual-rules disclaimer. `ruleSetVersion` stored per game; adjudicator is pluggable so an AXF-chase-aware version can be added later (not scheduled in M0–M7).
- **ADR-018 Coordinates/FEN/UCI** (resolves Q-002): files `a`-`i`, ranks `0`-`9` (Red's back rank = 0), `index = rank*9+file`. FEN uses Pikafish/UCCI convention (ranks 9→0, uppercase=Red, `K A B N R C P`, side `w`/`b`); start FEN `rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w - - 0 1`. Moves are 4-char UCI (`h2e2`) — identical to Pikafish's own format, no translation layer needed. Verified via perft/divide against a real Pikafish binary (golden fixtures) plus a live adapter test in M5. **CONFIRMED during T0.0: real Pikafish binary perft(4) from startpos = 3290240, matching expectation — convention is correct, no translation needed.**
- **ADR-019 Clock/disconnect** (resolves Q-003): presets 5+3 / **10+5 (default)** / 15+10 (increment absorbs latency); first move by each side untimed but must land within 60s or game `ABORTED`; server-receipt-time accounting, no lag compensation; exactly-once timeout finish via conditional `UPDATE ... WHERE status='ACTIVE' AND gameVersion=?`; no pausing in MVP; abandonment claimable after 60s of the mover being disconnected; client resyncs full snapshot on reconnect/`visibilitychange`; one pending draw offer at a time, 10-ply cooldown after decline.
- **ADR-020..025** (Proposed defaults): guest sessions via opaque hashed token in httpOnly cookie (not JWT), seats bound to `userId` never `socket.id`; 90-day guest purge / 180-day finished-game retention; rematch = new game same room, colors swapped, both must accept; Pikafish GPLv3 — server-side only, unmodified pinned build, isolated container, `/licenses` page with source link (**needs user/legal sign-off before public AI release**, does not block M5 dev); AI levels via movetime+MultiPV sampling (Easy 50ms/MultiPV5/within 300cp, Medium 200ms/MultiPV3/within 80cp, Hard 1000ms/MultiPV1); tooling conventions (`@xq/*` scope, dual ESM+CJS builds, Zod, Vitest).

## Monorepo target shape

```
xiangqi-platform/ (= D:\Workspace\Co_Tuong)
  apps/web/              # Next.js App Router
  apps/api/               # NestJS REST + Socket.IO
  packages/xiangqi-core/  # pure TS rules engine — no ui/dom/network/db deps
  packages/shared-contracts/  # Zod schemas, REST/socket types
  packages/api-client/    # typed fetch + socket client
  packages/content/       # lesson/puzzle schemas + validator
  services/pikafish-worker/   # isolated UCI engine subprocess worker
  infrastructure/docker/
  docs/                   # existing spec, versioned (renamed from Docs/)
  .agents/{briefs,runs}/  # per-task dispatch briefs + run logs (runs/ gitignored)
```

## M0 — Bootstrap

| ID | Executor | Task | Deps |
|---|---|---|---|
| T0.0 | Orchestrator | Pre-flight (Node/pnpm, `Docs`→`docs` rename, `git init`), fetch Pikafish binary+NNUE to `tools/pikafish/` (gitignored); smoke-test Codex sandbox (write/exec/network probe) and one Haiku agent edit | — |
| T0.1 | Orchestrator | Write `AGENTS.md` (root + `xiangqi-core`), `CLAUDE.md`, `.claude/agents/xq-haiku.md`, `.agents/{briefs,runs}/`, `LEDGER.md` + brief template | T0.0 |
| T0.2 | Codex | pnpm workspace scaffold: root `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `tsconfig.base.json`, package skeletons (dual build + vitest placeholder) for all 5 packages/services, `infrastructure/`, `.gitignore`/`.editorconfig`/`.nvmrc` | T0.1 |
| T0.3 | Codex | NestJS 11 skeleton: `/api/v1` prefix, Zod env config, `/health`, Vitest+supertest smoke test, imports core (CJS interop check) | T0.2 |
| T0.4 | Codex | Next.js App Router skeleton: Tailwind v4, shadcn/ui, Vitest+RTL, Playwright 3 projects (desktop-chromium, mobile-chrome, mobile-webkit), imports core (ESM interop check) | T0.2 |
| T0.5 | Haiku | ESLint flat config + boundary rules (core can't import react/next/nest/prisma/socket.io/node:*) | T0.3, T0.4 |
| T0.6 | Haiku | `docker-compose.dev.yml` (Postgres 17 + healthcheck), `.env.example`, README quickstart | T0.2 |
| T0.7 | Haiku | GitHub Actions CI skeleton (lint/typecheck/test/build + Postgres service) | T0.5 |
| T0.8 | Codex | Fixture schema + minimal UCI client in pikafish-worker (spawn, perft/divide parsing, FEN via `d`); `golden:gen` script (skips cleanly without `PIKAFISH_PATH`) | T0.2 |
| T0.9 | Haiku | Write ADR-017..025 into `docs/adr/` using the existing ADR template; write `docs/ux/lowfi.md` low-fi wireframes for 3 key routes | T0.0 |

**Gate:** `pnpm install --frozen-lockfile && pnpm turbo run build lint typecheck test` green; dev Postgres healthy; `/api/v1/health` 200; Playwright smoke passes; ADRs present.

## M1 — `xiangqi-core` (CORE-01..06)

| ID | Executor | Task | AC |
|---|---|---|---|
| T1.1 | **Codex** (size looks small but is load-bearing — coordinate contract everything depends on) | Branded `Square`, `createInitialPosition`, `toFen`/`fromFen` w/ strict validation, `encodeMove`/`decodeMove` | CORE-01,06 |
| T1.2 | Codex | Pseudo-legal move gen for all 7 pieces (palace/river/leg/eye/cannon-screen rules), attack detection | CORE-02 |
| T1.3 | Codex | Legality filter (no self-check, no facing generals), `getLegalMoves`/`isLegalMove`, pure `applyMove`, perft/divide | CORE-02,03 |
| T1.4 | Codex | Engine-oracle fixtures: ~25 curated tricky FENs + ~200 random playouts, cross-checked against real Pikafish | CORE-02,03,06 |
| T1.5 | Haiku | Expand piece/general-safety scenario tests (≥10/piece) from T1.2's pattern — reports disagreements, does not "fix" core to pass | CORE-02,03 |
| T1.6 | Codex | Game layer: `GameRecord`/`replay()`, repetition keys, the `xq-casual-1.0.0` RuleSet object, `evaluateGame()` per ADR-017, `ResultReason` enum | CORE-04,05 |
| T1.7 | Haiku | Expand repetition/chase/no-capture-limit/insufficient-material fixtures from T1.6's pattern | CORE-04,05 |
| T1.8 | Haiku | Property tests (fast-check): piece-count invariant, one general/side, turn alternation, FEN round-trip, `applyMove` purity | CORE-01..06 |
| T1.9 | Haiku | Exports, TSDoc, README, coverage thresholds (90%/85%) | — |
| T1.10 | **Codex, read-only sandbox** — independent cross-model review against §4.4 of the arch doc + ADR-017; each finding verified against the oracle before becoming a fix task | CORE-02..05 |

**Gate:** perft d1-d3 match reference; golden-oracle 100% match; coverage ≥90/85; boundary lint clean; all T1.10 findings resolved.

## M2 — 2D board + LocalGameController (parallel with M3)

| ID | Executor | Task | AC |
|---|---|---|---|
| T2.1 | Codex | `GameController` interface + `LocalGameController` (Zustand vanilla store), DOM-free tests | LOCAL-01 |
| T2.2 | Codex | `Board2D` SVG: geometry/orientation mapping, river/palace drawing, Chinese-character pieces, selection/legal-dots/last-move, tap+drag pointer handling, keyboard+aria | WEB-01 |
| T2.3 | Haiku | Piece glyph/theme map, `MoveList`/`CapturedPieces`/`GameStatusBanner`/`ResultDialog` | — |
| T2.4 | Haiku | `/play` mode picker + `/play/local` page, responsive layout | LOCAL-01,WEB-01 |
| T2.5 | Codex | Playwright local-game E2E (forced-mate sequence **derived from core**, not hand-written), 3 viewport projects | LOCAL-01,WEB-01 |
| T2.6 | Haiku | App shell/nav, `/` landing, loading/empty/error/offline states | — |
| T2.7 | Codex (**stretch — first to cut**) | Traditional vi/WXF notation toggle | — |

**Gate:** controller unit tests pass; local E2E green on 3 projects; screenshots reviewed at 375px/1280px.

## M3 — DB, API, guest sessions, persistence (parallel with M2)

| ID | Executor | Task | AC |
|---|---|---|---|
| T3.1 | Codex | `shared-contracts`: Zod schemas for Square/Move/Color/TimeControl/ClockState/GameStatus/ResultReason/RejectReason, snapshots, REST bodies, Socket.IO event maps, error envelope | — |
| T3.2 | Codex | Prisma schema + migration (extends logical schema w/ clock fields, `drawOfferBy/Ply`, unique `moveId`/`(gameId,ply)`); test harness w/ `migrate reset` | DATA-01 |
| T3.8 | Haiku (early — sets module pattern) | Exception filter→error envelope, ZodValidationPipe, request-id + pino logging, helmet/CORS, `/health` w/ DB ping | OPS-01(part) |
| T3.3 | **Codex** (looks like CRUD but is the main anti-impersonation defense) | Guest session module per ADR-020, `SessionGuard`, socket cookie resolution, throttling; tests for forged/expired/rotated tokens | ROOM-02 |
| T3.4 | Codex | Pure game aggregate: `clock.ts` (ADR-019 maths, injected `now`), `applyCommand()` → accepted/rejected/duplicate; exhaustive fake-time tests | CLOCK-01,SYNC-02 |
| T3.5 | Codex | `GamesService` persistence: transactional `SELECT...FOR UPDATE`, conditional version bump, moveId idempotency, periodic snapshots; integration tests for concurrent-submit (SYNC-01), duplicate moveId (SYNC-02), rebuild-from-snapshot (DATA-01) | SYNC-01,02,DATA-01 |
| T3.6 | Codex | Rooms module: create/join/get, 8-char room codes, seat assignment, join throttling | ROOM-01,02 |
| T3.7 | Haiku (copies T3.6 pattern) | Games REST controller: get/moves/resign/draw-offer/my-games | DATA-01 |
| T3.9 | Haiku | `api-client` typed fetch layer, mocked-fetch tests | — |

**Gate:** `prisma migrate reset` clean; integration suite (SYNC-01, SYNC-02, DATA-01, ROOM-02) green.

## M4 — Socket.IO rooms, clock, reconnect

| ID | Executor | Task | AC |
|---|---|---|---|
| T4.1 | Haiku | `api-client` `createGameSocket()` — typed, Zod-parsed inbound events | — |
| T4.2 | Codex | `GameGateway`: cookie handshake auth, join/move/sync/resign/draw/claim-win handlers, rate limiting, presence, broadcasts driven by domain events | SYNC-01..03,ROOM-02 |
| T4.3 | Codex | `ClockScheduler`: per-game timers, first-move abort, abandonment, boot recovery, exactly-once finish | CLOCK-01,DATA-01 |
| T4.4 | Codex | `OnlineGameController`: join/sync on connect+reconnect+visibilitychange, idempotent moveId resend on reject, server-time-offset clock display | SYNC-03 |
| T4.5 | Haiku | `/play/online` + `/room/[code]` pages | ROOM-01 |
| T4.6 | Haiku | `/game/[id]`: board+clock+actions+disconnect banner+result dialog | — |
| T4.7 | Haiku | Rematch flow per ADR-022 | — |
| T4.8 | Codex | Multiplayer Playwright: 2 contexts, create/join/play, reload-mid-turn, offline/restore, 3rd-context rejection | ROOM-01,02,SYNC-03,CLOCK-01 |

**Gate:** socket integration + two-context E2E green.

## M5 — Pikafish (revised after M4; see .agents/LEDGER.md for rationale)

| ID | Executor | Task | AC |
|---|---|---|---|
| T5.1 | Codex | Worker HTTP service (merges old T5.1+T5.2): engine pool, bounded queue, timeout→kill/respawn, `/health`+`/metrics`, internal bestmove endpoint implementing ADR-024's three difficulty profiles (time/MultiPV/weighted-random) — requires extending `services/pikafish-worker`'s UCI `commands.ts` to parse MultiPV `info` lines, which doesn't exist yet | AI-01,AI-02 |
| T5.3 | Codex | API `AiModule`: untimed AI games (`mode: 'AI'`, one `redId`/`blackId` left `null` for the engine's seat), calls T5.1's worker then re-submits the engine's move through `GamesService.submitMove`'s existing validated pipeline (never trusts the engine directly), fallback to capture-preferring random legal move on timeout/error/illegal engine move | AI-01 |
| T5.4 | Codex | `/play/ai` page (reuses `/game/[id]`'s `OnlineGameController`/components in AI mode — AI's move arrives the same way a human opponent's would, via the existing socket/REST flow) | — |
| T5.5 | Codex | Live adapter test vs. real Pikafish (skips without `PIKAFISH_PATH`) exercising the new MultiPV parsing | CORE-06,AI-01 |
| T5.6 | Codex | Pikafish Dockerfile (pinned tag, checksummed NNUE, `COPYING`/`SOURCE.md`), CPU/memory-limited compose service, matching T5.1's actual entrypoint/port | AI-02 |

**Gate:** 1000 simulated AI moves, 0 illegal applied, fallback exercised; queue limit holds under 10 concurrent games; live adapter test passes.

## M6 — Academy, puzzles, replay (revised after M4; see .agents/LEDGER.md for rationale)

Naming note: per the architecture doc, `lessons`/`puzzles`/`learning_progress` are real Prisma tables (not static files) — T6.1 includes the migration. "PuzzleController" (T6.5) and "ReplayController" (T6.8) are WEB-SIDE state controllers, the same pattern as `LocalGameController`/`OnlineGameController` (M2/M4) — the actual NestJS REST endpoints are T6.7's job.

| ID | Executor | Task | AC |
|---|---|---|---|
| T6.1 | Codex | `packages/content`: Zod schemas (Lesson/Puzzle per `docs/ux/lowfi.md`'s puzzle data model), loader, `content:validate` (replays every line through core); Prisma migration adding `lessons`/`puzzles`/`learning_progress` tables | LEARN-01 |
| T6.2 | Codex | Mate-in-N solver (N≤3) enforcing a unique key move, in `packages/content` (an authoring-time validation tool, not a runtime core rule) | LEARN-01 |
| T6.3 | Haiku | ~10 Vietnamese lessons, all FENs validator-checked | — |
| T6.4 | Haiku (guarded by Codex-built T6.2 validator, not by author correctness) | 25 puzzles from classic mating patterns, `editorialReview: pending` | LEARN-01 |
| T6.7 | Codex | NestJS content endpoints: `GET /lessons`, `GET /lessons/:slug`, `GET /puzzles`, `GET /puzzles/:id`, `POST /puzzles/:id/attempts` (writes `learning_progress`); also expose the already-built `GET /me/games` through `shared-contracts`/`api-client` (needed by T6.8, never wired up in M3/M4) | — |
| T6.5 | Codex | Web `PuzzleController` (zustand/vanilla, mirrors `LocalGameController`) + `/puzzles`, `/puzzles/[id]` pages (correct/wrong/hint/reset) per `docs/ux/lowfi.md`'s wireframe, tests | LEARN-01 |
| T6.6 | Codex | `/learn` + `/learn/[slug]` lesson renderer | — |
| T6.8 | Codex | Web `ReplayController` + `/history`, `/history/[id]`; every-ply FEN matches DB snapshots | REPLAY-01,DATA-01 |
| T6.9 | Haiku | `/profile` page (nickname edit via existing `PATCH /me`, recent-games shortcut into `/history`) | — |

**Gate:** `content:validate` passes for all lessons/puzzles; puzzle+replay E2E green.

## M7 — QA hardening & beta release

| ID | Executor | Task | AC |
|---|---|---|---|
| T7.1 | Codex | Authorization matrix (endpoint/event × role), then `/security-review` | ROOM-02 |
| T7.2 | Codex | Production images (Next standalone, `turbo prune`+`pnpm deploy`, one-shot migrate, Caddy HTTPS) | OPS-01 |
| T7.3 | Haiku | Backup/restore scripts + drill runbook, purge SQL, alert patterns | OPS-01 |
| T7.4 | Codex | Resilience suite: latency/offline injection, concurrent-tab moves, mid-game API restart | SYNC-03,DATA-01,CLOCK-01 |
| T7.5 | Haiku | CI: Playwright job, coverage gates, nightly perft d4 + live oracle | — |
| T7.6 | Haiku | `/rules` (casual disclaimer), `/privacy`, `/terms`, `/licenses` | — |
| T7.7 | Haiku | axe-core accessibility pass on every route, 320px overflow check, ≥44px tap targets | WEB-01 |
| T7.8 | Codex | Baseline perf measurement (room-join/move-accept p95, reconnect success, worker CPU) — baseline only, no SLA | AI-02 |
| T7.9 | **Orchestrator + user** | Walk release checklist (04§6): ADR approvals, 2-device/2-network smoke test, license sign-off, puzzle editorial review | All |

**Gate:** full regression green in CI; security matrix clean; restore drill done; prod compose up behind HTTPS.

## Effort split

Weighted: **Codex ~67%, Haiku ~33%** by task-size points (35 Codex tasks mostly M/L-sized, 30 Haiku tasks mostly S/M-sized) — close to the requested 70/30, with the gap explained by deliberately routing a few small-but-load-bearing or correctness-critical tasks to Codex (T1.1 coordinate codec, T3.3 guest sessions, T1.10 independent rules review) rather than mechanically hitting a ratio. Perpetual-chase rule design, any post-M3 change to `shared-contracts`, and re-planning if a milestone blows its budget are held back for the orchestrator/Opus, not given to either executor.

## Dispatch mechanics

**Per task**, the orchestrator writes a brief to `.agents/briefs/<ID>.md` (goal + AC IDs, allowed/forbidden file paths, exact contract excerpts quoted from the architecture doc, a pattern file to copy for Haiku tasks, required gate commands, stop-and-report conditions, required final-message format).

**Codex** (non-interactive, backgrounded for long tasks):
```bash
codex exec --cd "D:/Workspace/Co_Tuong" --sandbox workspace-write -c approval_policy=never \
  --output-last-message ".agents/runs/<ID>.final.md" \
  - < ".agents/briefs/<ID>.md" > ".agents/runs/<ID>.log" 2>&1
```
Read-only review tasks (T1.10) use `--sandbox read-only`. Dependency installs happen on the orchestrator's side *before* dispatch (sandbox has no network). Fix rounds use `codex exec resume <SESSION_ID>`. **See `.agents/NOTES.md` for sandbox quirks discovered during T0.0 (dot-directory write restriction, PowerShell execution-policy fix) before writing new briefs.**

**Haiku**: `Agent(subagent_type: "general-purpose", model: "haiku", prompt: "<brief path + exemplar file + allowed paths>")`, or the `xq-haiku` project subagent at `.claude/agents/xq-haiku.md`.

**Per-task loop**: confirm clean git tree → dispatch → check changed-file scope against allowed paths (revert out-of-scope changes) → run `pnpm turbo run lint typecheck test --filter=...<pkg>` → grep for AC-ID-tagged test titles → commit on green (with attribution trailer) and log to `LEDGER.md` → on red, at most 2 fix rounds before the orchestrator intervenes directly or re-briefs.

Each milestone gets its own branch, merged `--no-ff` to `main` at its gate, tagged `mN-done`. Lanes run in parallel where dependency-safe (M2 web / M3 api after M1; M5 worker / M6 content during M4), capped at 2 concurrent executors so review stays tractable.

## Risk mapping

| Risk | Mitigation |
|---|---|
| Repetition/chase complexity | ADR-017 scopes to casual-v1 w/ disclaimer; oracle-verified fixtures; property tests; independent T1.10 review; chase deferred, not claimed as official |
| Sync/clock drift after reconnect | Pure clock math w/ fake-time tests; row-lock + unique constraints; full-snapshot resync; exactly-once finish; drop/restart E2E |
| Pikafish CPU load | Isolated container, CPU limits, bounded queue, kill/respawn; AI games untimed so queueing never costs a player |
| GPLv3 exposure | Server-side only, unmodified pinned build, `/licenses` + source link; sign-off gated before public AI release |
| Guest impersonation/room hijack | Hashed opaque tokens, seats bound to userId not socket.id, single authorization choke point, room-code throttling, security review |
| Bad learning content | Validator replays every line; mate solver enforces unique key move; `editorialReview: pending` until reviewed |
| Mobile usability | Tap-to-tap first, full-cell hit areas, mobile Playwright projects, axe + 320px checks |
| 8-week timeline optimism | Per-milestone dispatch budgets, parallel lanes, capped fix rounds; explicit cut list if behind: notation toggle → drag-and-drop → abandonment-claim → rematch (fallback: new room) → lessons 10→6 → puzzles 25→20 → perf baseline |

## Verification

- M1: `pnpm --filter @xq/xiangqi-core test` (unit+property+oracle), perft depth 1-3 against reference counts.
- M3/M4: integration tests hit a real `xq_test` Postgres via `prisma migrate reset`; two-socket-client Vitest tests for SYNC-01/02/03.
- E2E: `pnpm --filter web exec playwright test` across desktop/mobile-chrome/mobile-webkit projects for local play (M2), multiplayer incl. reconnect/offline (M4), puzzles/replay (M6).
- M7: full CI regression + manual 2-device/2-network smoke test before beta tag.
