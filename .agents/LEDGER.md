# Dispatch Ledger

One row per dispatched task. Append-only. `Fix rounds` counts `codex exec resume` / re-brief cycles before green.

| Task ID | Executor | Branch | Commit SHA | AC IDs | Fix rounds | Notes |
|---|---|---|---|---|---|---|
| T0.0 | Orchestrator | main | (pending commit) | — | — | Node 20.11.1→22.23.4 (nvm, user ran elevated), pnpm 12.15.0 via corepack, git init, Docs→docs rename + moved to docs/spec/v1.0/, Pikafish binary+NNUE fetched to tools/pikafish/ (gitignored), perft(4)=3290240 verified against ADR-018 convention, Codex reinstalled for Node22, Codex/Haiku sandbox smoke-tested (see NOTES.md) |
| T0.1 | Orchestrator | main | (pending commit) | — | — | AGENTS.md (root + xiangqi-core), CLAUDE.md, .claude/agents/xq-haiku.md, .agents/{briefs,runs,PLAN.md,NOTES.md,LEDGER.md}, brief template |
| T0.2 | Codex | main | (pending commit) | — | 0 | pnpm/Turborepo scaffold: root config, 5 package skeletons (xiangqi-core, shared-contracts, api-client, content, pikafish-worker) with dual ESM+CJS build (tsup), vitest placeholder tests, infra READMEs. Gate green: `pnpm turbo run build lint typecheck test` — 20/20 tasks passed after orchestrator ran `pnpm install` (required `pnpm approve-builds --all` for esbuild postinstall) |
| T0.9 | Haiku | main | (pending commit) | — | 0 | ADR-017..025 + index written to docs/adr/, docs/ux/lowfi.md low-fi wireframes for /play/local, /game/[id], /puzzles/[id] |
| T0.6 | Haiku | main | (pending commit) | — | 0 | docker-compose.dev.yml (Postgres 17 + xq_test init), apps/api+web .env.example, root README |
| T0.3 | Codex | main | (pending commit) | — | 1 | NestJS skeleton: /api/v1 prefix, Zod env validation, /health (+ core import proof), supertest e2e test. Fix round: vitest config was missing `globals: true` (test file used global describe/it per its own tsconfig types) — orchestrator fixed directly, 1-line change |
| T0.4 | Codex | main | (pending commit) | — | 0 | Next.js 15.5.28 App Router + Tailwind v4 + hand-authored shadcn Button/Dialog + Vitest/RTL + Playwright (3 projects) skeleton |
| T0.8 | Codex | main | (pending commit) | — | 0 | UCI client (engine-process + commands) for pikafish-worker, fixture schema in xiangqi-core, golden:gen script. Verified end-to-end against real Pikafish binary (live smoke test + golden:gen both passed with PIKAFISH_PATH set, perft(4)=3290240 reconfirmed) |
| T1.1 | Codex | main | (pending commit) | CORE-01,06 | 0 | Square/Position/FEN/move codec. Orchestrator spot-checked FEN letter mapping and palace validation by hand against ADR-018 — correct. Gate green (4/4 tasks, 7 tests) |
