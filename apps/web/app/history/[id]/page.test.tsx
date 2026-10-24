import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CASUAL_RULESET, createInitialPosition, decodeMove, replay, toFen } from '@xq/xiangqi-core';
import type { GameSnapshot } from '@xq/shared-contracts';
import { apiClient } from '@/src/lib/api-client';
import ReplayPage from './page';

vi.mock('@/src/lib/api-client', () => ({ apiClient: { getGame: vi.fn() } }));

const initialFen = toFen(createInitialPosition());
const moves = ['a3a4', 'a6a5', 'c3c4'];
const snapshot: GameSnapshot = {
  gameId: 'game-1', status: 'FINISHED', initialFen, moves, gameVersion: moves.length,
  clocks: null, result: { winner: 'red', reason: 'RESIGNATION' },
  redPlayerId: 'red', blackPlayerId: 'black', drawOfferBy: null, serverNow: 1,
};

async function renderReplay() {
  let view!: ReturnType<typeof render>;
  await act(async () => {
    view = render(<ReplayPage params={Promise.resolve({ id: 'game-1' })} />);
    await Promise.resolve();
  });
  return view;
}

function expectBoardPosition(position: ReturnType<typeof createInitialPosition>) {
  const board = screen.getByRole('grid');
  for (let index = 0; index < position.board.length; index += 1) {
    const file = String.fromCharCode(97 + index % 9);
    const rank = Math.floor(index / 9);
    const piece = position.board[index];
    const label = piece ? `${file}${rank}, ${piece.color === 'red' ? 'Red' : 'Black'} ${piece.type[0] + piece.type.slice(1).toLowerCase()}` : `${file}${rank}, empty`;
    expect(board.querySelector(`[aria-label="${label}"]`), `square ${file}${rank}`).not.toBeNull();
  }
}

describe('/history/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiClient.getGame).mockResolvedValue(snapshot);
  });
  afterEach(cleanup);

  it('REPLAY-01 uses the rules engine position for any selected ply', async () => {
    const expectedSteps = replay({
      initialFen,
      moves: moves.map(decodeMove),
      ruleSetVersion: CASUAL_RULESET.version,
    });
    await renderReplay();
    await waitFor(() => expect(screen.getByRole('grid')).toBeInTheDocument());
    expectBoardPosition(expectedSteps[0]!.position);
    expect(screen.getByText(/Kết quả: Đỏ thắng/)).toBeInTheDocument();

    fireEvent.change(screen.getByRole('slider', { name: 'Chọn nước đi' }), { target: { value: '2' } });
    await waitFor(() => expect(screen.getByText('Nước đi: 2 / 3')).toBeInTheDocument());
    expectBoardPosition(expectedSteps[2]!.position);
    expect(screen.getByRole('slider')).toHaveValue('2');
    expect(apiClient.getGame).toHaveBeenCalledWith('game-1');
  });

  it('steps forward and backward with the controls', async () => {
    await renderReplay();
    await waitFor(() => expect(screen.getByRole('grid')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Tiếp' }));
    expect(screen.getByText('Nước đi: 1 / 3')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Trước' }));
    expect(screen.getByText('Nước đi: 0 / 3')).toBeInTheDocument();
  });
});
