import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fromFen } from '@xq/xiangqi-core';
import { apiClient } from '@/src/lib/api-client';
import LessonPage from './page';

const boardSpy = vi.hoisted(() => vi.fn());

vi.mock('@/src/features/session/use-session', () => ({
  useSession: () => ({ user: { id: 'u1', nickname: 'Tôi', type: 'guest' }, status: 'ready' }),
}));
vi.mock('@/src/lib/api-client', () => ({ apiClient: { getLesson: vi.fn() } }));
vi.mock('@/src/features/game/board/Board2D', () => ({
  Board2D: (props: { position: unknown }) => {
    boardSpy(props.position);
    return <div data-testid="lesson-board" />;
  },
}));

const lesson = {
  slug: 'lesson-test',
  title: 'Bài học thử',
  level: 'beginner' as const,
  steps: [
    { fen: '4k4/9/9/9/9/9/9/9/9/4K4 w - - 0 1', caption: 'Bước đầu', highlightSquares: [] },
    { fen: '4k4/9/9/9/4R4/9/9/9/9/4K4 b - - 0 1', caption: 'Bước giữa', highlightSquares: ['e5'] },
    { fen: '3k5/9/9/9/4R4/9/9/9/9/4K4 w - - 0 1', caption: 'Bước cuối', highlightSquares: ['e5'] },
  ],
};

async function renderLesson(slug = 'lesson-test') {
  let view!: ReturnType<typeof render>;
  await act(async () => {
    view = render(<LessonPage params={Promise.resolve({ slug })} />);
    await Promise.resolve();
  });
  return view;
}

describe('/learn/[slug]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiClient.getLesson).mockResolvedValue(lesson);
  });
  afterEach(cleanup);

  it('updates the caption and board position when stepping forward and back', async () => {
    await renderLesson();

    expect(await screen.findByText('Bước đầu')).toBeInTheDocument();
    expect(boardSpy).toHaveBeenLastCalledWith(fromFen(lesson.steps[0]!.fen));
    expect(apiClient.getLesson).toHaveBeenCalledWith('lesson-test');

    fireEvent.click(screen.getByRole('button', { name: 'Tiếp' }));
    expect(screen.getByText('Bước giữa')).toBeInTheDocument();
    expect(boardSpy).toHaveBeenLastCalledWith(fromFen(lesson.steps[1]!.fen));

    fireEvent.click(screen.getByRole('button', { name: 'Tiếp' }));
    expect(screen.getByText('Bước cuối')).toBeInTheDocument();
    expect(boardSpy).toHaveBeenLastCalledWith(fromFen(lesson.steps[2]!.fen));

    fireEvent.click(screen.getByRole('button', { name: 'Trước' }));
    expect(screen.getByText('Bước giữa')).toBeInTheDocument();
    expect(boardSpy).toHaveBeenLastCalledWith(fromFen(lesson.steps[1]!.fen));
  });

  it('shows an error state when loading a lesson fails', async () => {
    vi.mocked(apiClient.getLesson).mockRejectedValue(new Error('not found'));
    await renderLesson('missing');

    expect(await screen.findByRole('alert')).toHaveTextContent('Không thể tải bài học này.');
  });
});
