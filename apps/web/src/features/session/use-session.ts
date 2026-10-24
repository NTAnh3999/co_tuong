'use client'

import { useEffect, useRef, useState } from 'react'
import { ApiClientError } from '@xq/api-client'
import type { UserSummary } from '@xq/shared-contracts'
import { apiClient } from '@/src/lib/api-client'

export type SessionStatus = 'loading' | 'ready' | 'error'

export function useSession(): { user: UserSummary | null; status: SessionStatus } {
  const started = useRef(false)
  const [session, setSession] = useState<{ user: UserSummary | null; status: SessionStatus }>({
    user: null,
    status: 'loading',
  })

  useEffect(() => {
    if (started.current) return
    started.current = true

    async function loadSession() {
      try {
        const user = await apiClient.getMe()
        setSession({ user, status: 'ready' })
      } catch (error) {
        if (error instanceof ApiClientError && error.status === 401) {
          try {
            const user = await apiClient.createGuestSession({
              nickname: `Khách${Math.floor(1000 + Math.random() * 9000)}`,
            })
            setSession({ user, status: 'ready' })
          } catch {
            setSession({ user: null, status: 'error' })
          }
          return
        }
        setSession({ user: null, status: 'error' })
      }
    }

    void loadSession()
  }, [])

  return session
}
