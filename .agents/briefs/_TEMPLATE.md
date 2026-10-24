# Brief: <TASK_ID> — <short title>

## Goal

<One or two sentences: what this task produces and why.>

## Acceptance-criteria IDs

<e.g. CORE-02, CORE-03 — from docs/spec/v1.0/04_MVP_Roadmap_QA.md §3>

## Allowed paths

- `<glob>`
- `<glob>`

## Forbidden

- `package.json` dependency fields, the lockfile, `docs/adr/**`, `.github/**` (unless listed above)
- Running `pnpm install`/`pnpm add`
- `git commit`/`git push`

## Contracts / relevant ADRs

<Paste the exact TS interfaces, FEN/UCI convention clauses (ADR-018), RuleSet clauses (ADR-017), clock clauses (ADR-019), etc. that this task must conform to. Quote directly — do not make the executor re-derive from Vietnamese spec prose.>

## Pattern to copy (Haiku tasks)

<File path of an existing file with the same shape/structure/test style to follow.>

## Dependencies already installed

<List any new npm packages the orchestrator installed for this task, or "none — only existing deps.">

## Required tests

<Test file(s) to add/extend, with required `describe`/`it` title prefixes tagging AC IDs.>

## Gate commands

```bash
pnpm turbo run lint typecheck test --filter=<pkg>
```

## Stop-and-report conditions

- A needed dependency isn't installed.
- The task requires changing a contract in `packages/shared-contracts` or an ADR.
- The spec is ambiguous about expected behavior.

## Final message format

```
CHANGED FILES:
COMMANDS+RESULTS:
KNOWN GAPS:
QUESTIONS:
```
