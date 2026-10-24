# AGENTS.md — packages/xiangqi-core

Addendum to the root `AGENTS.md`. This package is the authoritative rules engine; bugs here corrupt every game ever played.

- **Purity is non-negotiable.** No imports of `react`, `next`, `@nestjs/*`, `@prisma/*`, `socket.io`, or `node:*`. No `Date.now()`, no `Math.random()` inside pure functions (`applyMove`, `getLegalMoves`, etc.) — if randomness or time is needed (e.g. fixture generation scripts), it lives outside `src/` or is injected as a parameter.
- **`applyMove(position, move)` must be pure**: never mutate its `position` argument. Tests deep-freeze inputs — a mutation is a test failure, not a lint warning.
- **Do not weaken a failing test to make it pass.** If a generated test (e.g. from the Pikafish oracle) disagrees with the implementation, treat the oracle as ground truth and fix the implementation, or stop and report the discrepancy — do not edit the test's expectation without verifying against the oracle first.
- **Coordinate/FEN convention is ADR-018** — see `docs/adr/ADR-018-coordinates-fen-uci.md`. Every FEN in this package's tests and fixtures uses that convention; there is no second convention anywhere.
- **RuleSet behavior is ADR-017** — see `docs/adr/ADR-017-ruleset-casual-v1.md`. `evaluateGame` must follow the adjudication order defined there exactly (no-legal-move → repetition/perpetual-check → no-capture limit → insufficient material → external terminal events).
