import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '@/src/lib/api-client'
import AiPlayPage from './page'

const { push } = vi.hoisted(() => ({ push: vi.fn() }))

vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))
vi.mock('@/src/lib/api-client', () => ({ apiClient: { createAiGame: vi.fn() } }))
vi.mock('@/src/features/session/use-session', () => ({ useSession: () => ({ user: { id: 'u1', nickname: 'Người chơi', type: 'guest' }, status: 'ready' }) }))

describe('/play/ai', () => {
  afterEach(cleanup)
  beforeEach(() => { vi.clearAllMocks() })

  it('renders color and difficulty choices after the session resolves', () => {
    render(<AiPlayPage />)
    expect(screen.getByLabelText('Đỏ')).toBeInTheDocument()
    expect(screen.getByLabelText('Đen')).toBeInTheDocument()
    expect(screen.getByLabelText('Dễ')).toBeInTheDocument()
    expect(screen.getByLabelText('Vừa')).toBeInTheDocument()
    expect(screen.getByLabelText('Khó')).toBeInTheDocument()
    expect(screen.getByDisplayValue('medium')).toBeChecked()
  })

  it('creates the selected AI game and navigates without a room query', async () => {
    vi.mocked(apiClient.createAiGame).mockResolvedValue({ gameId: 'game-42' })
    render(<AiPlayPage />)
    fireEvent.click(screen.getByDisplayValue('black'))
    fireEvent.click(screen.getByDisplayValue('hard'))
    fireEvent.click(screen.getByRole('button', { name: 'Bắt đầu chơi' }))

    await waitFor(() => expect(apiClient.createAiGame).toHaveBeenCalledWith({ color: 'black', difficulty: 'hard' }))
    await waitFor(() => expect(push).toHaveBeenCalledWith('/game/game-42'))
  })

  it('shows a create error and allows the user to stay on the picker', async () => {
    vi.mocked(apiClient.createAiGame).mockRejectedValue(new Error('Request failed'))
    render(<AiPlayPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Bắt đầu chơi' }))

    expect(await screen.findByText('Không thể tạo ván đấu lúc này. Vui lòng thử lại.')).toBeInTheDocument()
    expect(push).not.toHaveBeenCalled()
  })
})
