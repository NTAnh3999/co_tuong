import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '@/src/lib/api-client';
import PuzzleDetailPage from './page';

vi.mock('next/navigation', () => ({ useParams: () => ({ id: 'mate-in-one' }), useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/src/features/session/use-session', () => ({
  useSession: () => ({ user: { id: 'u1', nickname: 'Tôi', type: 'guest' }, status: 'ready' }),
}));
vi.mock('@/src/lib/api-client', () => ({ apiClient: { getPuzzle: vi.fn(), getPuzzles: vi.fn(), recordPuzzleAttempt: vi.fn() } }));

const puzzle = {
  id: 'mate-in-one',
  title: 'Chiếu hết trong một nước',
  difficulty: 1,
  objective: 'Chiếu hết Đen.',
  initialFen: '4k4/4r4/9/2R6/4R4/9/9/9/9/4K4 w - - 0 1',
  sideToMove: 'red' as const,
  solutionLines: [['c6c9']],
  allowedAlternatives: [],
  hints: ['Đưa xe lên hàng cuối.', 'Dùng xe ở c6.'],
  source: 'Bài kiểm chứng mate-in-1',
};

function tap(square: string) {
  const node = screen.getByRole('gridcell', { name: new RegExp(`^${square}, `) });
  fireEvent.pointerDown(node, { clientX: 100, clientY: 100 });
  fireEvent.pointerUp(node, { clientX: 100, clientY: 100 });
}

describe('LEARN-01 /puzzles/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiClient.getPuzzle).mockResolvedValue(puzzle);
    vi.mocked(apiClient.getPuzzles).mockResolvedValue([
      { id: 'mate-in-one', title: puzzle.title, difficulty: 1 },
      { id: 'next', title: 'Câu tiếp theo', difficulty: 2 },
    ]);
    vi.mocked(apiClient.recordPuzzleAttempt).mockResolvedValue({ status: 'completed', attempts: 1 });
  });
  afterEach(cleanup);

  it('plays on Board2D and records the solved attempt with hints used', async () => {
    render(<PuzzleDetailPage />);
    expect(await screen.findByText(puzzle.title)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Gợi ý (còn 2 lượt)' }));
    expect(screen.getByText(puzzle.hints[0]!)).toBeInTheDocument();
    tap('c6');
    tap('c9');

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Đúng! Bạn giải được.'));
    await waitFor(() => expect(apiClient.recordPuzzleAttempt).toHaveBeenCalledWith('mate-in-one', { completed: true, hintsUsed: 1 }));
    expect(screen.getByRole('button', { name: 'Puzzle tiếp theo →' })).toBeEnabled();
  });

  it('shows wrong moves without recording completion and reveals hints up to the cap', async () => {
    render(<PuzzleDetailPage />);
    await screen.findByText(puzzle.title);
    tap('e5');
    tap('e6');
    expect(await screen.findByRole('status')).toHaveTextContent('Sai nước. Thử lại.');
    expect(apiClient.recordPuzzleAttempt).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Gợi ý (còn 2 lượt)' }));
    fireEvent.click(screen.getByRole('button', { name: 'Gợi ý (còn 1 lượt)' }));
    expect(screen.getByText(puzzle.hints[0]!)).toBeInTheDocument();
    expect(screen.getByText(puzzle.hints[1]!)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Gợi ý (còn 0 lượt)' })).toBeDisabled();
  });
});
