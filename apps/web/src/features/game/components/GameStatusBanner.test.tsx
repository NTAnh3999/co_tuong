import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { GameResult } from '@xq/xiangqi-core';
import { GameStatusBanner } from './GameStatusBanner';

afterEach(cleanup);

describe('GameStatusBanner', () => {
  it('shows whose turn it is while the game is ongoing', () => {
    const { rerender } = render(<GameStatusBanner turn="red" result={null} orientation="red" />);
    expect(screen.getByRole('status')).toHaveTextContent('Đỏ đi');
    expect(screen.getByRole('status')).toHaveAttribute('data-state', 'ongoing');

    rerender(<GameStatusBanner turn="black" result={null} orientation="red" />);
    expect(screen.getByRole('status')).toHaveTextContent('Đen đi');
  });

  it.each<[GameResult, string]>([
    [{ winner: 'red', reason: 'CHECKMATE' }, 'Đỏ thắng — Chiếu bí'],
    [{ winner: null, reason: 'REPETITION' }, 'Hòa — Lặp thế'],
    [{ winner: 'black', reason: 'RESIGNATION' }, 'Đen thắng — Đầu hàng'],
  ])('shows the outcome for %j', (result, text) => {
    render(<GameStatusBanner turn="red" result={result} orientation="red" />);
    expect(screen.getByRole('status')).toHaveTextContent(text);
    expect(screen.getByRole('status')).toHaveAttribute('data-state', 'finished');
  });
});
