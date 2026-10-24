import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '@/src/lib/api-client';
import HistoryPage from './page';

vi.mock('@/src/features/session/use-session', () => ({
  useSession: () => ({ user: { id: 'u1', nickname: 'Tôi', type: 'guest' }, status: 'ready' }),
}));
vi.mock('@/src/lib/api-client', () => ({ apiClient: { getMyGames: vi.fn() } }));

describe('/history', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(cleanup);

  it('DATA-01 lists games and links each row to its replay', async () => {
    vi.mocked(apiClient.getMyGames).mockResolvedValue({ games: [
      { gameId: 'game-1', opponent: { id: 'u2', nickname: 'Bạn cờ' }, status: 'FINISHED', result: { winner: 'red', reason: 'RESIGNATION' } },
      { gameId: 'game-2', opponent: null, status: 'ACTIVE', result: null },
    ] });
    render(<HistoryPage />);

    expect(await screen.findByText('Đối thủ: Bạn cờ')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Bạn cờ/ })).toHaveAttribute('href', '/history/game-1');
    expect(screen.getByRole('link', { name: /Máy/ })).toHaveAttribute('href', '/history/game-2');
    expect(screen.getByText(/Đỏ thắng/)).toBeInTheDocument();
    await waitFor(() => expect(apiClient.getMyGames).toHaveBeenCalledOnce());
  });

  it('DATA-01 shows a friendly empty state when there are no games', async () => {
    vi.mocked(apiClient.getMyGames).mockResolvedValue({ games: [] });
    render(<HistoryPage />);

    expect(await screen.findByText('Bạn chưa có ván cờ nào.')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
