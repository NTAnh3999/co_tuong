import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import { Suspense } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createInitialPosition } from '@xq/xiangqi-core'
import type { OnlineGameControllerState } from '@/src/features/game/controller/online-game-controller'

const harness = vi.hoisted(() => ({
  state: null as OnlineGameControllerState | null,
  listeners: new Set<() => void>(),
  controller: null as unknown,
}))

vi.mock('@/src/features/session/use-session', () => ({
  useSession: () => ({ user: { id: 'spectator', nickname: 'Spectator', type: 'guest' }, status: 'ready' }),
}))

vi.mock('@/src/lib/api-client', () => ({
  apiClient: { getGame: vi.fn(async () => ({
    gameId: 'game-1', status: 'ACTIVE', initialFen: 'fen', moves: [], gameVersion: 0,
    clocks: null, result: null, redPlayerId: 'red-player', blackPlayerId: 'black-player', drawOfferBy: null, serverNow: 1,
  })), offerDraw: vi.fn() },
  socketOrigin: () => 'http://localhost:3001',
}))

vi.mock('@/src/features/game/controller/online-game-controller', () => ({
  createOnlineGameController: vi.fn(() => harness.controller),
}))

import OnlineGamePage from './page'

function makeState(overrides: Partial<OnlineGameControllerState> = {}): OnlineGameControllerState {
  return {
    position: createInitialPosition(), history: [], lastMove: null, selectedSquare: null, legalTargets: [],
    orientation: 'red', result: null, clocks: null, gameVersion: 0, connectionStatus: 'connected',
    pendingMoveId: null, lastRejection: null, ...overrides,
  }
}

function publish() {
  harness.listeners.forEach((listener) => listener())
}

async function renderGame() {
  let result!: ReturnType<typeof render>
  await act(async () => {
    result = render(<Suspense fallback={<div>Đang tải</div>}><OnlineGamePage params={Promise.resolve({ id: 'game-1' })} /></Suspense>)
    await Promise.resolve()
  })
  return result
}

beforeEach(() => {
  harness.state = makeState()
  harness.listeners.clear()
  harness.controller = {
    getState: () => harness.state!,
    subscribe: (listener: () => void) => { harness.listeners.add(listener); return () => harness.listeners.delete(listener) },
    selectSquare: vi.fn(), submitMove: vi.fn(), flip: vi.fn(), resign: vi.fn(), offerDraw: vi.fn(), dispose: vi.fn(),
  }
})

afterEach(cleanup)

describe('SYNC-03: /game/[id] online page', () => {
  it('renders the board non-interactive for a spectator', async () => {
    await renderGame()
    await waitFor(() => expect(screen.getByRole('grid')).toHaveAttribute('tabindex', '-1'))
  })

  it('opens ResultDialog when the controller reports a result', async () => {
    await renderGame()
    await waitFor(() => expect(screen.getByRole('grid')).toBeInTheDocument())
    act(() => {
      harness.state = makeState({ result: { winner: 'red', reason: 'CHECKMATE' } })
      publish()
    })
    expect(await screen.findByRole('dialog')).toHaveTextContent('Đỏ thắng — Chiếu bí')
  })

  it('shows reconnect banner only while the socket is disconnected', async () => {
    await renderGame()
    await waitFor(() => expect(screen.getByRole('grid')).toBeInTheDocument())
    act(() => {
      harness.state = makeState({ connectionStatus: 'disconnected' })
      publish()
    })
    expect(screen.getByRole('alert')).toHaveTextContent('Mất kết nối, đang thử kết nối lại...')

    act(() => {
      harness.state = makeState({ connectionStatus: 'connected' })
      publish()
    })
    expect(screen.queryByRole('alert')).toBeNull()
  })
})
