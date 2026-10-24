import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '@/src/lib/api-client';
import LearnPage from './page';

vi.mock('@/src/features/session/use-session', () => ({
  useSession: () => ({ user: { id: 'u1', nickname: 'Tôi', type: 'guest' }, status: 'ready' }),
}));
vi.mock('@/src/lib/api-client', () => ({ apiClient: { getLessons: vi.fn() } }));

describe('/learn', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(cleanup);

  it('lists lessons under Vietnamese level labels with their lesson links', async () => {
    vi.mocked(apiClient.getLessons).mockResolvedValue([
      { slug: 'co-ban', title: 'Nước đi đầu tiên', level: 'beginner' },
      { slug: 'chien-thuat', title: 'Chiến thuật', level: 'intermediate' },
      { slug: 'tan-cuoc', title: 'Tàn cuộc', level: 'advanced' },
    ]);
    render(<LearnPage />);

    expect(await screen.findByRole('link', { name: 'Nước đi đầu tiên' })).toHaveAttribute('href', '/learn/co-ban');
    expect(screen.getByRole('heading', { name: 'Cơ bản' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Trung bình' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Nâng cao' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Chiến thuật' })).toHaveAttribute('href', '/learn/chien-thuat');
    expect(screen.getByRole('link', { name: 'Tàn cuộc' })).toHaveAttribute('href', '/learn/tan-cuoc');
    await waitFor(() => expect(apiClient.getLessons).toHaveBeenCalledOnce());
  });

  it('shows a loading state while lessons are being fetched', async () => {
    let resolveLessons!: (lessons: []) => void;
    vi.mocked(apiClient.getLessons).mockReturnValue(new Promise((resolve) => { resolveLessons = resolve; }));
    render(<LearnPage />);

    expect(screen.getByRole('status')).toHaveTextContent('Đang tải bài học');
    await act(async () => resolveLessons([]));
    expect(await screen.findByText('Hiện chưa có bài học nào.')).toBeInTheDocument();
  });

  it('shows an error state when loading lessons fails', async () => {
    vi.mocked(apiClient.getLessons).mockRejectedValue(new Error('unavailable'));
    render(<LearnPage />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Không thể tải danh sách bài học.');
  });
});
