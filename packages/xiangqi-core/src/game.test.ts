import { describe, expect, it } from 'vitest';
import { fromFen, toFen } from './fen.js';
import {
  CASUAL_RULESET, decodeMove, evaluateGame, getAllLegalMoves, isInCheck,
  positionKey, replay, squareToIndex, toSquare,
} from './index.js';
import type { Color, GameRecord, PieceType, Position } from './index.js';

function position(turn: Color, ...placements: readonly (readonly [string, Color, PieceType])[]): Position {
  const board = Array.from({ length: 90 }, () => null as Position['board'][number]);
  for (const [square, color, type] of placements) {
    const file = square.charCodeAt(0) - 97;
    const rank = Number(square[1]);
    board[rank * 9 + file] = { color, type };
  }
  return { board, turn, halfmoveClock: 0, fullmoveNumber: 1 };
}

function record(pos: Position, moves: readonly string[] = [], terminalEvent?: GameRecord['terminalEvent']): GameRecord {
  return {
    initialFen: toFen(pos),
    moves: moves.map(decodeMove),
    ruleSetVersion: 'xq-casual-1.0.0',
    ...(terminalEvent === undefined ? {} : { terminalEvent }),
  };
}

const ongoing = position('red', ['d0', 'red', 'GENERAL'], ['e9', 'black', 'GENERAL'], ['a0', 'red', 'CHARIOT']);

describe('CORE-04: game result classification and replay', () => {
  it('CORE-04: classifies checkmate and gives it priority over an external event', () => {
    const mate = position(
      'red', ['e0', 'red', 'GENERAL'], ['e9', 'black', 'GENERAL'], ['e2', 'black', 'CHARIOT'],
      ['d0', 'red', 'SOLDIER'], ['f0', 'red', 'SOLDIER'],
    );
    expect(getAllLegalMoves(mate, 'red')).toEqual([]);
    expect(isInCheck(mate, 'red')).toBe(true);
    expect(evaluateGame(record(mate, [], { type: 'RESIGNATION', loser: 'red' }), { version: 'test', noCaptureLimitPlies: 120 }))
      .toEqual({ winner: 'black', reason: 'CHECKMATE' });
  });

  it('CORE-04: classifies stalemate as a loss when the side is not in check', () => {
    const blocked = position(
      'red', ['e1', 'red', 'GENERAL'], ['e9', 'black', 'GENERAL'],
      ['d1', 'red', 'ADVISOR'], ['f1', 'red', 'ADVISOR'], ['e0', 'red', 'ADVISOR'], ['e2', 'red', 'ADVISOR'],
    );
    expect(isInCheck(blocked, 'red')).toBe(false);
    expect(getAllLegalMoves(blocked, 'red')).toEqual([]);
    expect(evaluateGame(record(blocked), { version: 'test', noCaptureLimitPlies: 120 }))
      .toEqual({ winner: 'black', reason: 'STALEMATE' });
  });

  it('CORE-04: ends in a draw at the configured no-capture limit', () => {
    const limit = { ...ongoing, halfmoveClock: 120 };
    expect(evaluateGame(record(limit), { version: 'test', noCaptureLimitPlies: 120 }))
      .toEqual({ winner: null, reason: 'MOVE_LIMIT' });
  });

  it('CORE-04: draws when neither side has attacking material', () => {
    const bare = position('red', ['d0', 'red', 'GENERAL'], ['e9', 'black', 'GENERAL'], ['e1', 'red', 'ADVISOR'], ['d9', 'black', 'ELEPHANT']);
    expect(evaluateGame(record(bare), { version: 'test', noCaptureLimitPlies: 120 }))
      .toEqual({ winner: null, reason: 'INSUFFICIENT_MATERIAL' });
  });

  it('CORE-04: classifies resignation, draw agreement, timeout, abandonment, and abort', () => {
    const rules = { version: 'test', noCaptureLimitPlies: 120 };
    expect(evaluateGame(record(ongoing, [], { type: 'RESIGNATION', loser: 'red' }), rules))
      .toEqual({ winner: 'black', reason: 'RESIGNATION' });
    expect(evaluateGame(record(ongoing, [], { type: 'DRAW_AGREEMENT' }), rules))
      .toEqual({ winner: null, reason: 'DRAW_AGREEMENT' });
    expect(evaluateGame(record(ongoing, [], { type: 'TIMEOUT', loser: 'black' }), rules))
      .toEqual({ winner: 'red', reason: 'TIMEOUT' });
    expect(evaluateGame(record(ongoing, [], { type: 'ABANDONMENT', loser: 'red' }), rules))
      .toEqual({ winner: 'black', reason: 'ABANDONMENT' });
    expect(evaluateGame(record(ongoing, [], { type: 'ABORTED' }), rules))
      .toEqual({ winner: null, reason: 'ABORTED' });
  });

  it('CORE-04: gives no timeout win when the potential winner lacks attacking material', () => {
    const bareWinner = position('red', ['d0', 'red', 'GENERAL'], ['e9', 'black', 'GENERAL'], ['a0', 'red', 'CHARIOT'], ['d9', 'black', 'ADVISOR']);
    expect(evaluateGame(record(bareWinner, [], { type: 'TIMEOUT', loser: 'red' }), { version: 'test', noCaptureLimitPlies: 120 }))
      .toEqual({ winner: null, reason: 'TIMEOUT_INSUFFICIENT_MATERIAL' });
  });

  it('CORE-04: returns null for a non-terminal game', () => {
    expect(evaluateGame(record(ongoing), { version: 'test', noCaptureLimitPlies: 120 })).toBeNull();
  });

  it('CORE-04: replays positions, captures, and check flags for a verified sequence', () => {
    const steps = replay(record(fromFen('rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w - - 0 1'), [
      'e3e4', 'e6e5', 'e4e5', 'a6a5',
    ]));
    expect(steps).toHaveLength(5);
    expect(steps.map((step) => step.ply)).toEqual([0, 1, 2, 3, 4]);
    expect(steps[3]?.captured).toEqual({ color: 'black', type: 'SOLDIER' });
    expect(steps[0]?.captured).toBeNull();
    expect(steps.slice(0, 5).every((step) => step.isCheck === false)).toBe(true);
    expect(steps[4]?.position.board[squareToIndex(toSquare('a5'))]).toEqual({ color: 'black', type: 'SOLDIER' });
    expect(steps[4]?.position.halfmoveClock).toBe(1);
  });

  it('CORE-04: ignores counters in position keys but includes side to move', () => {
    const base = ongoing;
    expect(positionKey(base)).toBe(positionKey({ ...base, halfmoveClock: 57, fullmoveNumber: 42 }));
    expect(positionKey(base)).not.toBe(positionKey({ ...base, turn: 'black' }));
  });
});

describe('CORE-05: repetition and perpetual-check adjudication', () => {
  it('CORE-05: loses for perpetual check on the third occurrence of a position', () => {
    const checking = position('red', ['d0', 'red', 'GENERAL'], ['d5', 'red', 'SOLDIER'], ['d8', 'red', 'CHARIOT'], ['e9', 'black', 'GENERAL']);
    const moves = ['d8e8', 'e9d9', 'e8d8', 'd9e9', 'd8e8', 'e9d9', 'e8d8', 'd9e9'];
    const game = record(checking, moves);
    const steps = replay(game);
    expect(steps[1]?.isCheck).toBe(true);
    expect(steps[3]?.isCheck).toBe(true);
    expect(steps[5]?.isCheck).toBe(true);
    expect(steps[7]?.isCheck).toBe(true);
    expect(evaluateGame(game, { version: 'test', noCaptureLimitPlies: 120 }))
      .toEqual({ winner: 'black', reason: 'PERPETUAL_CHECK' });
  });

  it('CORE-05: draws a third repetition when neither side checks continuously', () => {
    const quiet = position('red', ['d0', 'red', 'GENERAL'], ['e9', 'black', 'GENERAL'], ['a0', 'red', 'CHARIOT'], ['c9', 'black', 'HORSE']);
    const moves = ['a0a1', 'c9b7', 'a1a0', 'b7c9', 'a0a1', 'c9b7', 'a1a0', 'b7c9'];
    const game = record(quiet, moves);
    expect(evaluateGame(game, { version: 'test', noCaptureLimitPlies: 120 }))
      .toEqual({ winner: null, reason: 'REPETITION' });
  });

  it('CORE-05: loses for perpetual check when Black delivers it (mirror of the Red case)', () => {
    const checking = position('black', ['f9', 'black', 'GENERAL'], ['f4', 'black', 'SOLDIER'], ['f1', 'black', 'CHARIOT'], ['e0', 'red', 'GENERAL']);
    const moves = ['f1e1', 'e0f0', 'e1f1', 'f0e0', 'f1e1', 'e0f0', 'e1f1', 'f0e0'];
    const game = record(checking, moves);
    const steps = replay(game);
    expect(steps[1]?.isCheck).toBe(true);
    expect(steps[3]?.isCheck).toBe(true);
    expect(steps[5]?.isCheck).toBe(true);
    expect(steps[7]?.isCheck).toBe(true);
    expect(steps[2]?.isCheck).toBe(false);
    expect(steps[4]?.isCheck).toBe(false);
    expect(evaluateGame(game, { version: 'test', noCaptureLimitPlies: 120 }))
      .toEqual({ winner: 'red', reason: 'PERPETUAL_CHECK' });
  });

  it('CORE-05: a capture inside a checking cycle breaks the repetition window', () => {
    const checking = position('red', ['d0', 'red', 'GENERAL'], ['d5', 'red', 'SOLDIER'], ['d8', 'red', 'CHARIOT'], ['e9', 'black', 'GENERAL'], ['a8', 'black', 'SOLDIER']);
    const moves = ['d8e8', 'e9d9', 'e8d8', 'd9e9', 'd8a8'];
    const game = record(checking, moves);
    const steps = replay(game);
    expect(steps[1]?.isCheck).toBe(true);
    expect(steps[4]?.position.board).toEqual(steps[0]?.position.board);
    expect(steps[5]?.captured).toEqual({ color: 'black', type: 'SOLDIER' });
    expect(evaluateGame(game, { version: 'test', noCaptureLimitPlies: 120 })).toBeNull();
  });

  it('CORE-05: two occurrences of a checking cycle are not yet a perpetual check', () => {
    const checking = position('red', ['d0', 'red', 'GENERAL'], ['d5', 'red', 'SOLDIER'], ['d8', 'red', 'CHARIOT'], ['e9', 'black', 'GENERAL']);
    const game = record(checking, ['d8e8', 'e9d9', 'e8d8', 'd9e9']);
    expect(evaluateGame(game, { version: 'test', noCaptureLimitPlies: 120 })).toBeNull();
  });

  it('CORE-05: a position that occurs only twice does not draw by repetition', () => {
    const quiet = position('red', ['d0', 'red', 'GENERAL'], ['e9', 'black', 'GENERAL'], ['a0', 'red', 'CHARIOT'], ['c9', 'black', 'HORSE']);
    const game = record(quiet, ['a0a1', 'c9b7', 'a1a0', 'b7c9']);
    expect(evaluateGame(game, { version: 'test', noCaptureLimitPlies: 120 })).toBeNull();
  });

  it('CORE-05: repetition key distinguishes side to move and ignores move counters', () => {
    const redToMove = position('red', ['d0', 'red', 'GENERAL'], ['e9', 'black', 'GENERAL'], ['a0', 'red', 'CHARIOT']);
    const blackToMove = { ...redToMove, turn: 'black' as const };
    const laterCounters = { ...redToMove, halfmoveClock: 99, fullmoveNumber: 50 };
    expect(positionKey(redToMove)).not.toBe(positionKey(blackToMove));
    expect(positionKey(redToMove)).toBe(positionKey(laterCounters));
    expect(positionKey(redToMove)).toBe(toFen(redToMove).split(' ').slice(0, 2).join(' '));
  });

  it.todo('CORE-05: mutual perpetual check (both sides check every own move) resolves as REPETITION; no fixture found yet');

  it('CORE-05: locks in the earliest 3rd-occurrence result even if the record keeps going (T1.10 regression)', () => {
    // Found by the T1.10 independent review: the original repetitionResult() only looked
    // at whether the FINAL position's key had reached 3+ occurrences "by the end," using
    // the window from the 1st occurrence to the LAST one. That let trailing moves recorded
    // after the true 3rd occurrence silently overturn an already-decided PERPETUAL_CHECK
    // into a REPETITION draw. The fix adjudicates at the earliest 3rd occurrence instead.
    // Extra Advisors (far from the checking dance on files d/e) give both sides a legal,
    // non-checking "there and back" pair of moves to pad the game with, without touching
    // the Chariot/General/Soldier that drive the actual repeating check pattern.
    const checking = position(
      'red',
      ['d0', 'red', 'GENERAL'], ['d5', 'red', 'SOLDIER'], ['d8', 'red', 'CHARIOT'], ['f0', 'red', 'ADVISOR'],
      ['e9', 'black', 'GENERAL'], ['f9', 'black', 'ADVISOR'],
    );
    const trueEndingMoves = ['d8e8', 'e9d9', 'e8d8', 'd9e9', 'd8e8', 'e9d9', 'e8d8', 'd9e9'];
    const nonCheckingTrailingMoves = ['f0e1', 'f9e8', 'e1f0', 'e8f9'];
    const extended = record(checking, [...trueEndingMoves, ...nonCheckingTrailingMoves]);

    // Sanity-check the premise: the 4 trailing moves bring the SAME position key back a
    // 4th time, and none of the trailing Advisor shuffles deliver check.
    const steps = replay(extended);
    expect(positionKey(steps[12]!.position)).toBe(positionKey(steps[8]!.position));
    expect(steps[9]?.isCheck).toBe(false);
    expect(steps[10]?.isCheck).toBe(false);
    expect(steps[11]?.isCheck).toBe(false);
    expect(steps[12]?.isCheck).toBe(false);

    expect(evaluateGame(extended, { version: 'test', noCaptureLimitPlies: 120 }))
      .toEqual({ winner: 'black', reason: 'PERPETUAL_CHECK' });
  });
});

describe('CORE-04: no-capture limit and insufficient material', () => {
  const rules = { version: 'test', noCaptureLimitPlies: 120 };

  it('CORE-04: does not end at 119 plies without a capture', () => {
    const near = { ...ongoing, halfmoveClock: 119 };
    expect(getAllLegalMoves(near, 'red').length).toBeGreaterThan(0);
    expect(evaluateGame(record(near), rules)).toBeNull();
  });

  it('CORE-04: reads the configured no-capture limit rather than a hardcoded 120', () => {
    const custom = { version: 'test', noCaptureLimitPlies: 10 };
    expect(evaluateGame(record({ ...ongoing, halfmoveClock: 10 }), custom))
      .toEqual({ winner: null, reason: 'MOVE_LIMIT' });
    expect(evaluateGame(record({ ...ongoing, halfmoveClock: 9 }), custom)).toBeNull();
    expect(evaluateGame(record({ ...ongoing, halfmoveClock: 10 }), CASUAL_RULESET)).toBeNull();
  });

  it('CORE-04: generals alone is insufficient material', () => {
    const generals = position('red', ['d0', 'red', 'GENERAL'], ['e9', 'black', 'GENERAL']);
    expect(getAllLegalMoves(generals, 'red').length).toBeGreaterThan(0);
    expect(evaluateGame(record(generals), rules))
      .toEqual({ winner: null, reason: 'INSUFFICIENT_MATERIAL' });
  });

  it('CORE-04: one side keeping attacking material means the game is not insufficient', () => {
    const redRook = position('red', ['d0', 'red', 'GENERAL'], ['a0', 'red', 'CHARIOT'], ['e9', 'black', 'GENERAL'], ['d9', 'black', 'ADVISOR']);
    expect(evaluateGame(record(redRook), rules)).toBeNull();
    const blackSoldier = position('red', ['d0', 'red', 'GENERAL'], ['e1', 'red', 'ADVISOR'], ['e9', 'black', 'GENERAL'], ['a6', 'black', 'SOLDIER']);
    expect(evaluateGame(record(blackSoldier), rules)).toBeNull();
  });

  it('CORE-04: advisors and elephants are not attacking material', () => {
    const defensive = position(
      'red',
      ['d0', 'red', 'GENERAL'], ['e1', 'red', 'ADVISOR'], ['f0', 'red', 'ADVISOR'], ['c0', 'red', 'ELEPHANT'], ['g2', 'red', 'ELEPHANT'],
      ['e9', 'black', 'GENERAL'], ['d7', 'black', 'ADVISOR'], ['f9', 'black', 'ADVISOR'], ['a7', 'black', 'ELEPHANT'], ['g9', 'black', 'ELEPHANT'],
    );
    expect(getAllLegalMoves(defensive, 'red').length).toBeGreaterThan(0);
    expect(evaluateGame(record(defensive), rules))
      .toEqual({ winner: null, reason: 'INSUFFICIENT_MATERIAL' });
  });
});
