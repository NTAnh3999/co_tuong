import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ResultDialog } from './ResultDialog';

afterEach(cleanup);

describe('ResultDialog', () => {
  it('is not rendered when result is null', () => {
    render(<ResultDialog result={null} onClose={vi.fn()} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('shows the outcome text when result is set', () => {
    render(<ResultDialog result={{ winner: 'red', reason: 'CHECKMATE' }} onClose={vi.fn()} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('Đỏ thắng — Chiếu bí');
  });

  it('calls onRematch when the rematch button is clicked', () => {
    const onRematch = vi.fn();
    const onClose = vi.fn();
    render(<ResultDialog result={{ winner: null, reason: 'REPETITION' }} onRematch={onRematch} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Chơi lại' }));
    expect(onRematch).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('omits the rematch button when onRematch is not provided', () => {
    render(<ResultDialog result={{ winner: null, reason: 'REPETITION' }} onClose={vi.fn()} />);
    expect(screen.queryByRole('button', { name: 'Chơi lại' })).toBeNull();
  });

  it('calls onClose when the close action is clicked', () => {
    const onClose = vi.fn();
    render(<ResultDialog result={{ winner: 'black', reason: 'TIMEOUT' }} onRematch={vi.fn()} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Xem bàn cờ' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
