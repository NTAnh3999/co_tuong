import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import { Suspense } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { RoomSnapshot } from '@xq/shared-contracts'
import { apiClient } from '@/src/lib/api-client'
import RoomPage from './page'

const { push, createGameSocket, socketHandlers, socket } = vi.hoisted(() => {
  const handlers: { current?: { onConnect?: () => void; onRoomState?: (room: unknown) => void } } = {}
  const mockSocket = { joinRoom: vi.fn(), disconnect: vi.fn() }
  return {
    push: vi.fn(),
    socketHandlers: handlers,
    socket: mockSocket,
    createGameSocket: vi.fn((_url: string, nextHandlers: typeof handlers.current) => {
      handlers.current = nextHandlers
      return mockSocket
    }),
  }
})

vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))
vi.mock('@xq/api-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@xq/api-client')>()
  return { ...actual, createGameSocket }
})
vi.mock('@/src/lib/api-client', () => ({ apiClient: { getRoom: vi.fn(), joinRoom: vi.fn() }, socketOrigin: () => 'http://localhost:3001' }))
vi.mock('@/src/features/session/use-session', () => ({ useSession: () => ({ user: { id: 'me', nickname: 'Tôi', type: 'guest' }, status: 'ready' }) }))

const room = (members: RoomSnapshot['members'] = [{ userId: 'host', nickname: 'Chủ', color: 'red', isHost: true }]): RoomSnapshot => ({
  roomId: 'room-id-1', code: 'ABCD12', status: 'WAITING',
  timeControl: { initialMs: 600_000, incrementMs: 5_000 }, members, gameId: null,
})

async function renderRoom() {
  let result!: ReturnType<typeof render>
  await act(async () => {
    result = render(<Suspense fallback={<div>Đang tải</div>}><RoomPage params={Promise.resolve({ code: 'ABCD12' })} /></Suspense>)
    await Promise.resolve()
  })
  return result
}

describe('/room/[code]', () => {
  afterEach(cleanup)
  beforeEach(() => { vi.clearAllMocks(); socketHandlers.current = undefined })

  it('ROOM-02 joins a waiting room when the current user is not a member', async () => {
    vi.mocked(apiClient.getRoom).mockResolvedValue(room())
    vi.mocked(apiClient.joinRoom).mockResolvedValue(room([
      { userId: 'host', nickname: 'Chủ', color: 'red', isHost: true },
      { userId: 'me', nickname: 'Tôi', color: 'black', isHost: false },
    ]))
    await renderRoom()
    await waitFor(() => expect(apiClient.joinRoom).toHaveBeenCalledOnce())
    expect(apiClient.joinRoom).toHaveBeenCalledWith('ABCD12')
    await waitFor(() => expect(createGameSocket).toHaveBeenCalledWith('http://localhost:3001', expect.any(Object)))
    act(() => socketHandlers.current?.onConnect?.())
    expect(socket.joinRoom).toHaveBeenCalledWith('room-id-1')
  })

  it('ROOM-02 does not join when the current user is already a member', async () => {
    vi.mocked(apiClient.getRoom).mockResolvedValue(room([
      { userId: 'me', nickname: 'Tôi', color: 'red', isHost: true },
    ]))
    await renderRoom()
    await waitFor(() => expect(createGameSocket).toHaveBeenCalledOnce())
    expect(apiClient.joinRoom).not.toHaveBeenCalled()
  })

  it('ROOM-02 navigates when a live room state starts a game', async () => {
    vi.mocked(apiClient.getRoom).mockResolvedValue(room([
      { userId: 'me', nickname: 'Tôi', color: 'red', isHost: true },
    ]))
    await renderRoom()
    await waitFor(() => expect(socketHandlers.current?.onRoomState).toBeTypeOf('function'))
    act(() => socketHandlers.current?.onRoomState?.({
      ...room([{ userId: 'me', nickname: 'Tôi', color: 'red', isHost: true }]),
      status: 'STARTED', gameId: 'game-42',
    }))
    await waitFor(() => expect(push).toHaveBeenCalledWith('/game/game-42'))
  })
})
