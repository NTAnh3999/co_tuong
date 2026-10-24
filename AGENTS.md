# AGENTS.md — Xiangqi Learn & Play

This file is read by every execution agent (Codex, Haiku) before starting a dispatched task. Package-level `AGENTS.md` files add constraints on top of this one; they never relax it.

## What this project is

A Xiangqi (Cờ Tướng) web platform: Next.js (web) + NestJS/Socket.IO (api) + PostgreSQL, built around a pure-TypeScript rules engine (`packages/xiangqi-core`). Full spec lives in `docs/spec/v1.0/` (Vietnamese). The execution plan with milestones, task IDs and acceptance-criteria IDs lives in `.agents/PLAN.md`.

## Hard rules for every task

1. **Read the brief at `.agents/briefs/<TASK_ID>.md` first.** It is the source of truth for scope, allowed paths, contracts to implement, and the pattern file to copy (if any). This file (`AGENTS.md`) is background; the brief is the assignment.
2. **Only touch files inside the brief's "Allowed paths."** Never edit `package.json` dependencies, the lockfile, files under `docs/adr/**`, or `.github/**` unless the brief explicitly says so.
3. **Never run `pnpm install`, `pnpm add`, or anything that touches the lockfile or node_modules.** Dependencies are installed by the orchestrator before dispatch. If you need a package that isn't installed, stop and report it — do not add it yourself.
4. **Never `git commit`, `git push`, or change git config.** The orchestrator commits after reviewing the diff.
5. **`packages/xiangqi-core` is a pure package.** It may not import `react`, `next`, `@nestjs/*`, `@prisma/*`, `socket.io`, or any `node:*` built-in. It has no DOM, network, or database dependency. This is enforced by ESLint boundary rules — do not work around the lint rule, fix the design instead.
6. **Coordinates/FEN/UCI convention is fixed by ADR-018** (`docs/adr/ADR-018-coordinates-fen-uci.md`): files `a`-`i`, ranks `0`-`9` with Red's back rank = 0, `index = rank*9 + file`, FEN in Pikafish/UCCI form, moves as 4-character UCI (`h2e2`). Do not invent a different convention anywhere in the codebase.
7. **Game results follow the RuleSet in ADR-017** (`docs/adr/ADR-017-ruleset-casual-v1.md`), not international chess rules. No-legal-moves is always a loss (never stalemate-as-draw). Perpetual chase is explicitly NOT implemented — do not add it.
8. **Server is authoritative for online games.** Client-side code may predict/optimistically render but must reconcile to server state; never let client code decide a game result or clock outcome.
9. **Tests are part of the task, not optional.** Follow the brief's required test titles (prefixed with the acceptance-criteria ID, e.g. `CORE-02`) and gate commands. A task is not done until its gate command is green.
10. **If something in the brief is ambiguous, underspecified, or conflicts with this file, stop and report the question** in your final message instead of guessing. Use the final-message format below.

## Final message format (required for every task)

```
CHANGED FILES: <list>
COMMANDS+RESULTS: <gate commands you ran and their pass/fail output>
KNOWN GAPS: <anything left incomplete or simplified, and why>
QUESTIONS: <anything you need the orchestrator to decide — empty if none>
```

## Conventions

- Package scope `@xq/*`. Internal packages build dual ESM+CJS (NestJS is CJS, Next.js/Vite tooling is ESM).
- Zod is the only runtime schema/validation library.
- Vitest for all unit/integration tests; Playwright for E2E (`apps/web`). `unplugin-swc` is used so NestJS decorator metadata works under Vitest.
- TypeScript strict mode, `noUncheckedIndexedAccess` on, `verbatimModuleSyntax` on — respect both.
- Commit messages, ADRs, and this file are written in English; user-facing content (lessons, puzzles, UI copy) is in Vietnamese.
