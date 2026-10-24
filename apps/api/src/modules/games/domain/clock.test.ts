import { describe, expect, it } from 'vitest';
import type { ClockState, TimeControl } from '@xq/shared-contracts';
import {
  applyMoveToClock,
  createClockState,
  isClockExpired,
  isFirstMoveTimedOut,
  remainingMsAt,
} from './clock.js';

const timeControl: TimeControl = { initialMs: 300_000, incrementMs: 5_000 };

describe('CLOCK-01: clock math', () => {
  it('CLOCK-01: starts both clocks at initialMs with Red active', () => {
    expect(createClockState(timeControl, 1234)).toEqual({
      redRemainingMs: 300_000,
      blackRemainingMs: 300_000,
      activeColor: 'red',
      turnStartedAt: 1234,
    });
  });

  it('CLOCK-01: counts down only the active Red clock when reading remaining time', () => {
    const state = createClockState(timeControl, 1000);
    expect(remainingMsAt(state, 2500)).toEqual({ red: 298_500, black: 300_000 });
    expect(state.turnStartedAt).toBe(1000);
  });

  it('CLOCK-01: counts down only the active Black clock when reading remaining time', () => {
    const state: ClockState = {
      ...createClockState(timeControl, 1000),
      activeColor: 'black',
      redRemainingMs: 80_000,
      blackRemainingMs: 90_000,
    };
    expect(remainingMsAt(state, 2500)).toEqual({ red: 80_000, black: 88_500 });
  });

  it('CLOCK-01: deducts elapsed time, adds increment, and switches sides after a timed move', () => {
    const state: ClockState = {
      ...createClockState(timeControl, 1000),
      redRemainingMs: 40_000,
      blackRemainingMs: 50_000,
    };
    // 40_000 - (11_000 - 1_000) elapsed + 5_000 increment = 35_000.
    expect(applyMoveToClock(state, timeControl, 11_000, false)).toEqual({
      redRemainingMs: 35_000,
      blackRemainingMs: 50_000,
      activeColor: 'black',
      turnStartedAt: 11_000,
    });
  });

  it('CLOCK-01: skips deduction but still awards increment and switches sides on the mover’s first move', () => {
    const state = createClockState(timeControl, 1000);
    expect(applyMoveToClock(state, timeControl, 90_000, true)).toEqual({
      redRemainingMs: 305_000,
      blackRemainingMs: 300_000,
      activeColor: 'black',
      turnStartedAt: 90_000,
    });
  });

  it('CLOCK-01: uses a strict greater-than 60-second first-move timeout boundary', () => {
    expect(isFirstMoveTimedOut(10_000, 70_000)).toBe(false);
    expect(isFirstMoveTimedOut(10_000, 70_001)).toBe(true);
    expect(isFirstMoveTimedOut(10_000, 69_999)).toBe(false);
  });

  it('CLOCK-01: expires the active side at zero while leaving the inactive side unaffected', () => {
    const redClock: ClockState = {
      ...createClockState({ initialMs: 1000, incrementMs: 0 }, 500),
      redRemainingMs: 1000,
      blackRemainingMs: 0,
    };
    expect(isClockExpired(redClock, 1500)).toBe('red');
    expect(isClockExpired(redClock, 1499)).toBeNull();

    const blackClock: ClockState = {
      ...redClock,
      activeColor: 'black',
      turnStartedAt: 500,
      blackRemainingMs: 1500,
      redRemainingMs: 0,
    };
    expect(isClockExpired(blackClock, 2000)).toBe('black');
    expect(isClockExpired({ ...blackClock, blackRemainingMs: 1501 }, 2000)).toBeNull();
  });
});
