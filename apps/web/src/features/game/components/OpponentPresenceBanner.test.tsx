import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ABANDONMENT_THRESHOLD_MS } from '@xq/shared-contracts';
import { OpponentPresenceBanner } from './OpponentPresenceBanner';

afterEach(cleanup);

describe('OpponentPresenceBanner', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('counts down second by second while under the abandonment threshold and disables claiming', () => {
    const onClaimWin = vi.fn();
    const disconnectedAt = Date.now();
    render(<OpponentPresenceBanner disconnectedAt={disconnectedAt} onClaimWin={onClaimWin} />);

    expect(screen.getByRole('status')).toHaveTextContent('đang chờ kết nối lại');
    expect(screen.getByRole('status')).toHaveTextContent('60s');
    expect(screen.queryByRole('button', { name: 'Tuyên bố thắng' })).not.toBeInTheDocument();

    act(() => { vi.advanceTimersByTime(1_000); });
    expect(screen.getByRole('status')).toHaveTextContent('59s');
    act(() => { vi.advanceTimersByTime(10_000); });
    expect(screen.getByRole('status')).toHaveTextContent('49s');

    act(() => { vi.advanceTimersByTime(ABANDONMENT_THRESHOLD_MS); });
    expect(screen.getByRole('status')).toHaveTextContent('mất kết nối quá lâu');
  });

  it('enables claiming the win once the threshold has elapsed', () => {
    const onClaimWin = vi.fn();
    const disconnectedAt = Date.now() - ABANDONMENT_THRESHOLD_MS - 1_000;
    render(<OpponentPresenceBanner disconnectedAt={disconnectedAt} onClaimWin={onClaimWin} />);

    const button = screen.getByRole('button', { name: 'Tuyên bố thắng' });
    fireEvent.click(button);
    expect(onClaimWin).toHaveBeenCalledOnce();
  });
});
