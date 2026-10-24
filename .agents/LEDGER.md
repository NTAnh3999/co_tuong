# Dispatch Ledger

One row per dispatched task. Append-only. `Fix rounds` counts `codex exec resume` / re-brief cycles before green.

| Task ID | Executor | Branch | Commit SHA | AC IDs | Fix rounds | Notes |
|---|---|---|---|---|---|---|
| T0.0 | Orchestrator | main | (pending commit) | — | — | Node 20.11.1→22.23.4 (nvm, user ran elevated), pnpm 12.15.0 via corepack, git init, Docs→docs rename + moved to docs/spec/v1.0/, Pikafish binary+NNUE fetched to tools/pikafish/ (gitignored), perft(4)=3290240 verified against ADR-018 convention, Codex reinstalled for Node22, Codex/Haiku sandbox smoke-tested (see NOTES.md) |
| T0.1 | Orchestrator | main | (pending commit) | — | — | AGENTS.md (root + xiangqi-core), CLAUDE.md, .claude/agents/xq-haiku.md, .agents/{briefs,runs,PLAN.md,NOTES.md,LEDGER.md}, brief template |
