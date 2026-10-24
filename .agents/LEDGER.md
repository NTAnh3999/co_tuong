# Dispatch Ledger

One row per dispatched task. Append-only. `Fix rounds` counts `codex exec resume` / re-brief cycles before green.

| Task ID | Executor | Branch | Commit SHA | AC IDs | Fix rounds | Notes |
|---|---|---|---|---|---|---|
| T0.0 | Orchestrator | main | (pending commit) | — | — | Node 20.11.1→22.23.4 (nvm, user ran elevated), pnpm 12.15.0 via corepack, git init, Docs→docs rename + moved to docs/spec/v1.0/, Pikafish binary+NNUE fetched to tools/pikafish/ (gitignored), perft(4)=3290240 verified against ADR-018 convention, Codex reinstalled for Node22, Codex/Haiku sandbox smoke-tested (see NOTES.md) |
| T0.1 | Orchestrator | main | (pending commit) | — | — | AGENTS.md (root + xiangqi-core), CLAUDE.md, .claude/agents/xq-haiku.md, .agents/{briefs,runs,PLAN.md,NOTES.md,LEDGER.md}, brief template |
| T0.2 | Codex | main | (pending commit) | — | 0 | pnpm/Turborepo scaffold: root config, 5 package skeletons (xiangqi-core, shared-contracts, api-client, content, pikafish-worker) with dual ESM+CJS build (tsup), vitest placeholder tests, infra READMEs. Gate green: `pnpm turbo run build lint typecheck test` — 20/20 tasks passed after orchestrator ran `pnpm install` (required `pnpm approve-builds --all` for esbuild postinstall) |
| T0.9 | Haiku | main | (pending commit) | — | 0 | ADR-017..025 + index written to docs/adr/, docs/ux/lowfi.md low-fi wireframes for /play/local, /game/[id], /puzzles/[id] |
