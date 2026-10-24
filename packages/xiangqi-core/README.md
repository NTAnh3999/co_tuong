# @xq/xiangqi-core

A pure TypeScript Xiangqi (Chinese Chess) rules engine: no UI, DOM, network, or database dependencies.

## Install and import

This package is internal to the monorepo. Depend on it as a workspace package and import from the
entry point only:

```ts
import {
  createInitialPosition, getLegalMoves, applyMove, toSquare, encodeMove, toFen,
} from '@xq/xiangqi-core';
```

Every export is listed in `src/index.ts`. Anything not exported there is internal and may change.

## Quick example

```ts
import {
  CASUAL_RULESET, applyMove, createInitialPosition, encodeMove, evaluateGame,
  getLegalMoves, toFen, toSquare,
} from '@xq/xiangqi-core';

// 1. Start from the standard opening position (Red to move).
const start = createInitialPosition();

// 2. Legal moves for the piece on h2 (Red's left cannon).
const moves = getLegalMoves(start, toSquare('h2'));
console.log(moves.map(encodeMove)); // UCI strings such as 'h2e2'

// 3. Apply a move. The input position is never mutated; a new Position is returned.
const after = applyMove(start, moves[0]!);
console.log(toFen(after));

// 4. Check the game result. null means the game is still in progress.
const result = evaluateGame(
  { initialFen: toFen(start), moves: [moves[0]!], ruleSetVersion: CASUAL_RULESET.version },
  CASUAL_RULESET,
);
console.log(result); // null
```

Other entry points: `getAllLegalMoves` (every move for one side), `isLegalMove` (validate a
move for the side to move), `isInCheck`, `replay` (step through a `GameRecord`), `perft` and
`divide` (move-generation verification).

## Coordinates, FEN, and UCI

Squares, FEN strings, and move notation follow ADR-018: files `a`-`i`, ranks `0`-`9` with Red's
back rank at 0, board index `rank * 9 + file`, FEN in Pikafish/UCCI form, and moves as 4-character
UCI (for example `h2e2`). See [`docs/adr/ADR-018-coordinates-fen-uci.md`](../../docs/adr/ADR-018-coordinates-fen-uci.md).

## Game-ending rules

Results follow the casual ruleset in
[`docs/adr/ADR-017-ruleset-casual-v1.md`](../../docs/adr/ADR-017-ruleset-casual-v1.md). It is
**not** the official AXF competitive rules. In particular, having no legal moves is always a loss
(never a stalemate draw), and perpetual chase is not implemented. `evaluateGame` applies the
adjudication order from ADR-017.

## Tests

The suite has three parts: unit tests for each module, fixtures verified against the real
Pikafish engine (perft divide output), and property-based tests with `fast-check`.

Run `pnpm --filter @xq/xiangqi-core test` for the tests, or `test:coverage` for the coverage
report. Coverage thresholds are 90% lines and 85% branches, enforced in `vitest.config.ts`.
