import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '@/src/lib/api-client'
import OnlinePlayPage from './page'

const { push } = vi.hoisted(() => ({ push: vi.fn() }))

vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))
vi.mock('@/src/lib/api-client', () => ({ apiClient: { createRoom: vi.fn() } }))
vi.mock('@/src/features/session/use-session', () => ({ useSession: () => ({ user: { id: 'u1', nickname: 'Người chơi', type: 'guest' }, status: 'ready' }) }))

describe('/play/online', () => {
  afterEach(cleanup)
  beforeEach(() => { vi.clearAllMocks() })

  it('ROOM-01 renders all time controls and color choices', () => {
    render(<OnlinePlayPage />)
    expect(screen.getByText('Nhanh')).toBeInTheDocument()
    expect(screen.getByText('Tiêu chuẩn')).toBeInTheDocument()
    expect(screen.getByText('Chậm')).toBeInTheDocument()
    expect(screen.getByLabelText('Đỏ')).toBeInTheDocument()
    expect(screen.getByLabelText('Đen')).toBeInTheDocument()
    expect(screen.getByLabelText('Ngẫu nhiên')).toBeInTheDocument()
  })

  it('ROOM-01 creates the selected room and navigates using its code', async () => {
    vi.mocked(apiClient.createRoom).mockResolvedValue({
      roomId: 'room-1', code: 'ABCD12', status: 'WAITING',
      timeControl: { initialMs: 300_000, incrementMs: 3_000 }, members: [], gameId: null,
    })
    render(<OnlinePlayPage />)
    fireEvent.click(screen.getByDisplayValue('Nhanh'))
    fireEvent.click(screen.getByDisplayValue('red'))
    fireEvent.click(screen.getByRole('button', { name: 'Tạo phòng' }))
    await waitFor(() => expect(apiClient.createRoom).toHaveBeenCalledWith({
      timeControl: { initialMs: 300_000, incrementMs: 3_000 }, hostColor: 'red',
    }))
    expect(push).toHaveBeenCalledWith('/room/ABCD12')
  })
})
