import { cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiClientError } from '@xq/api-client'
import { apiClient } from '@/src/lib/api-client'
import { useSession } from './use-session'

vi.mock('@/src/lib/api-client', () => ({
  apiClient: { getMe: vi.fn(), createGuestSession: vi.fn() },
}))

const user = { id: 'user-1', nickname: 'Người chơi', type: 'guest' as const }

describe('useSession', () => {
  afterEach(cleanup)
  beforeEach(() => vi.clearAllMocks())

  it('ROOM-01 gets the current user without creating a guest', async () => {
    vi.mocked(apiClient.getMe).mockResolvedValue(user)
    const { result } = renderHook(() => useSession())
    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(result.current.user).toEqual(user)
    expect(apiClient.createGuestSession).not.toHaveBeenCalled()
  })

  it('ROOM-01 creates a guest after a 401 and uses its response', async () => {
    const guest = { id: 'guest-2', nickname: 'Khách2345', type: 'guest' as const }
    vi.mocked(apiClient.getMe).mockRejectedValue(new ApiClientError({
      code: 'UNAUTHORIZED', message: 'Unauthorized', status: 401,
    }))
    vi.mocked(apiClient.createGuestSession).mockResolvedValue(guest)
    const { result } = renderHook(() => useSession())
    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(result.current.user).toEqual(guest)
    expect(apiClient.createGuestSession).toHaveBeenCalledWith(expect.objectContaining({ nickname: expect.stringMatching(/^Khách\d{4}$/) }))
  })

  it('ROOM-01 reports other API failures without creating a guest', async () => {
    vi.mocked(apiClient.getMe).mockRejectedValue(new ApiClientError({
      code: 'SERVER_ERROR', message: 'Unavailable', status: 500,
    }))
    const { result } = renderHook(() => useSession())
    await waitFor(() => expect(result.current.status).toBe('error'))
    expect(result.current.user).toBeNull()
    expect(apiClient.createGuestSession).not.toHaveBeenCalled()
  })
})
