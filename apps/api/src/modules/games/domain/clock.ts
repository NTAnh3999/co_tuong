import type { ClockState, Color, TimeControl } from '@xq/shared-contracts';

const FIRST_MOVE_LIMIT_MS = 60_000;

export function createClockState(timeControl: TimeControl, now: number): ClockState {
  return {
    redRemainingMs: timeControl.initialMs,
    blackRemainingMs: timeControl.initialMs,
    activeColor: 'red',
    turnStartedAt: now,
  };
}

export function remainingMsAt(state: ClockState, now: number): { red: number; black: number } {
  const elapsed = Math.max(0, now - state.turnStartedAt);
  return {
    red: Math.max(0, state.redRemainingMs - (state.activeColor === 'red' ? elapsed : 0)),
    black: Math.max(0, state.blackRemainingMs - (state.activeColor === 'black' ? elapsed : 0)),
  };
}

export function applyMoveToClock(
  state: ClockState,
  timeControl: TimeControl,
  now: number,
  isMoverFirstMoveOfGame: boolean,
): ClockState {
  const elapsed = isMoverFirstMoveOfGame ? 0 : Math.max(0, now - state.turnStartedAt);
  const nextRemaining = Math.max(0, state.activeColor === 'red'
    ? state.redRemainingMs - elapsed + timeControl.incrementMs
    : state.blackRemainingMs - elapsed + timeControl.incrementMs);

  return {
    redRemainingMs: state.activeColor === 'red' ? nextRemaining : state.redRemainingMs,
    blackRemainingMs: state.activeColor === 'black' ? nextRemaining : state.blackRemainingMs,
    activeColor: state.activeColor === 'red' ? 'black' : 'red',
    turnStartedAt: now,
  };
}

export function isFirstMoveTimedOut(turnStartedAt: number, now: number): boolean {
  return now - turnStartedAt > FIRST_MOVE_LIMIT_MS;
}

export function isClockExpired(state: ClockState, now: number): Color | null {
  const remaining = remainingMsAt(state, now);
  if (state.activeColor === 'red' && remaining.red <= 0) return 'red';
  if (state.activeColor === 'black' && remaining.black <= 0) return 'black';
  return null;
}
