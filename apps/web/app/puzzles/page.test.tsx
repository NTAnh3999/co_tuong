import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '@/src/lib/api-client';
import PuzzlesPage from './page';

vi.mock('@/src/features/session/use-session', () => ({
  useSession: () => ({ user: { id: 'u1', nickname: 'Tôi', type: 'guest' }, status: 'ready' }),
}));
vi.mock('@/src/lib/api-client', () => ({ apiClient: { getPuzzles: vi.fn() } }));

describe('LEARN-01 /puzzles', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(cleanup);

  it('renders each puzzle with a link to its detail page', async () => {
    vi.mocked(apiClient.getPuzzles).mockResolvedValue([
      { id: 'puzzle-a', title: 'Chiếu hết', difficulty: 2 },
      { id: 'puzzle-b', title: 'Bắt quân', difficulty: 4 },
    ]);
    render(<PuzzlesPage />);

    expect(await screen.findByText('Chiếu hết')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Chiếu hết/ })).toHaveAttribute('href', '/puzzles/puzzle-a');
    expect(screen.getByRole('link', { name: /Bắt quân/ })).toHaveAttribute('href', '/puzzles/puzzle-b');
    await waitFor(() => expect(apiClient.getPuzzles).toHaveBeenCalledOnce());
  });
});
