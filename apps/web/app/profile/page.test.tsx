import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiClientError } from '@xq/api-client'
import { apiClient } from '@/src/lib/api-client'
import ProfilePage from './page'

vi.mock('@/src/lib/api-client', () => ({ apiClient: { updateMe: vi.fn(), getMyGames: vi.fn() } }))
vi.mock('@/src/features/session/use-session', () => ({
  useSession: () => ({ user: { id: 'u1', nickname: 'Người chơi', type: 'registered' }, status: 'ready' }),
}))

describe('/profile', () => {
  afterEach(cleanup)
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(apiClient.getMyGames).mockResolvedValue({ games: [] })
  })

  it('renders the current nickname pre-filled once the session resolves', async () => {
    render(<ProfilePage />)
    expect(screen.getByLabelText('Biệt danh')).toHaveValue('Người chơi')
    await waitFor(() => expect(apiClient.getMyGames).toHaveBeenCalledTimes(1))
  })

  it('submitting a new nickname calls updateMe and shows a success message', async () => {
    vi.mocked(apiClient.updateMe).mockResolvedValue({ id: 'u1', nickname: 'Tướng Mới', type: 'registered' })
    render(<ProfilePage />)
    fireEvent.change(screen.getByLabelText('Biệt danh'), { target: { value: 'Tướng Mới' } })
    fireEvent.click(screen.getByRole('button', { name: 'Lưu biệt danh' }))

    await waitFor(() => expect(apiClient.updateMe).toHaveBeenCalledWith({ nickname: 'Tướng Mới' }))
    expect(await screen.findByText('Đã cập nhật biệt danh.')).toBeInTheDocument()
    expect(screen.getByLabelText('Biệt danh')).toHaveValue('Tướng Mới')
  })

  it('a failed updateMe shows an inline error and keeps the typed input', async () => {
    vi.mocked(apiClient.updateMe).mockRejectedValue(new Error('Request failed'))
    render(<ProfilePage />)
    fireEvent.change(screen.getByLabelText('Biệt danh'), { target: { value: 'Tên Lỗi' } })
    fireEvent.click(screen.getByRole('button', { name: 'Lưu biệt danh' }))

    expect(await screen.findByText('Không thể cập nhật biệt danh lúc này. Vui lòng thử lại.')).toBeInTheDocument()
    expect(screen.getByLabelText('Biệt danh')).toHaveValue('Tên Lỗi')
    expect(screen.queryByText('Đã cập nhật biệt danh.')).not.toBeInTheDocument()
  })

  it('shows the API error message when updateMe is rejected with ApiClientError', async () => {
    vi.mocked(apiClient.updateMe).mockRejectedValue(
      new ApiClientError({ code: 'VALIDATION_FAILED', message: 'Biệt danh quá dài', status: 400 }),
    )
    render(<ProfilePage />)
    fireEvent.click(screen.getByRole('button', { name: 'Lưu biệt danh' }))

    expect(await screen.findByText('Biệt danh quá dài')).toBeInTheDocument()
    expect(screen.getByLabelText('Biệt danh')).toHaveValue('Người chơi')
  })

  it('renders recent games linking to /history/<gameId> and a view-all link', async () => {
    vi.mocked(apiClient.getMyGames).mockResolvedValue({
      games: [
        { gameId: 'game-1', opponent: { id: 'o1', nickname: 'Đối thủ A' }, status: 'FINISHED', result: null },
        { gameId: 'game-2', opponent: null, status: 'ACTIVE', result: null },
      ],
    })
    render(<ProfilePage />)

    const first = await screen.findByRole('link', { name: 'Đấu với Đối thủ A' })
    expect(first).toHaveAttribute('href', '/history/game-1')
    expect(screen.getByRole('link', { name: 'Ván đấu với AI' })).toHaveAttribute('href', '/history/game-2')
    expect(screen.getByRole('link', { name: 'Xem tất cả' })).toHaveAttribute('href', '/history')
  })

  it('limits the recent games list to five entries', async () => {
    vi.mocked(apiClient.getMyGames).mockResolvedValue({
      games: Array.from({ length: 7 }, (_, index) => ({
        gameId: `game-${index}`,
        opponent: null,
        status: 'FINISHED',
        result: null,
      })),
    })
    render(<ProfilePage />)

    await waitFor(() => expect(screen.getAllByRole('link', { name: 'Ván đấu với AI' })).toHaveLength(5))
    expect(document.querySelector('a[href="/history/game-4"]')).not.toBeNull()
    expect(document.querySelector('a[href="/history/game-5"]')).toBeNull()
  })

  it('an empty games list shows a friendly empty state, not an error', async () => {
    vi.mocked(apiClient.getMyGames).mockResolvedValue({ games: [] })
    render(<ProfilePage />)

    expect(await screen.findByText('Bạn chưa có ván đấu nào. Hãy bắt đầu một ván mới!')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
