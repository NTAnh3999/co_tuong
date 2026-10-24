'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ApiClientError } from '@xq/api-client'
import type { GetMyGamesResponse } from '@xq/shared-contracts'
import { Button } from '@/components/ui/button'
import ErrorState from '@/src/components/states/ErrorState'
import LoadingState from '@/src/components/states/LoadingState'
import { useSession } from '@/src/features/session/use-session'
import { apiClient } from '@/src/lib/api-client'

const RECENT_GAMES_LIMIT = 5

type GamesState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; games: GetMyGamesResponse['games'] }

export default function ProfilePage() {
  const { user, status } = useSession()
  const [nickname, setNickname] = useState('')
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [games, setGames] = useState<GamesState>({ status: 'loading' })

  const userNickname = user?.nickname
  const isReady = status === 'ready' && user !== null

  // Pre-fill the input once the session resolves (keyed on the primitive, not the object).
  useEffect(() => {
    if (userNickname !== undefined) setNickname(userNickname)
  }, [userNickname])

  // Load recent games once we have an authenticated session.
  useEffect(() => {
    if (!isReady) return
    let cancelled = false
    apiClient
      .getMyGames()
      .then((response) => {
        if (!cancelled) setGames({ status: 'ready', games: response.games })
      })
      .catch(() => {
        if (!cancelled) setGames({ status: 'error' })
      })
    return () => {
      cancelled = true
    }
  }, [isReady])

  async function saveNickname() {
    const next = nickname.trim()
    if (!user || busy || next.length === 0) return
    setBusy(true)
    setError(null)
    setSaved(false)
    try {
      const updated = await apiClient.updateMe({ nickname: next })
      setNickname(updated.nickname)
      setSaved(true)
    } catch (cause) {
      // Keep the input exactly as the user typed it; only surface the error.
      setError(cause instanceof ApiClientError ? cause.message : 'Không thể cập nhật biệt danh lúc này. Vui lòng thử lại.')
    } finally {
      setBusy(false)
    }
  }

  const recentGames = games.status === 'ready' ? games.games.slice(0, RECENT_GAMES_LIMIT) : []

  return (
    <main className="flex min-h-screen flex-col items-center bg-background px-4 py-10 text-foreground">
      <section className="flex w-full max-w-lg flex-col gap-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold">Cá nhân</h1>
          <p className="text-sm text-muted-foreground">Quản lý biệt danh và xem các ván đấu gần đây.</p>
        </header>

        {status === 'loading' ? <LoadingState message="Đang tải thông tin..." /> : null}
        {status === 'error' || (status === 'ready' && !user)
          ? <ErrorState message="Không thể tải thông tin tài khoản. Vui lòng tải lại trang." />
          : null}

        {status === 'ready' && user ? (
          <>
            <form
              className="flex flex-col gap-4"
              onSubmit={(event) => {
                event.preventDefault()
                void saveNickname()
              }}
            >
              <div className="space-y-2">
                <label htmlFor="nickname" className="text-sm font-semibold">Biệt danh</label>
                <input
                  id="nickname"
                  name="nickname"
                  type="text"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  value={nickname}
                  disabled={busy}
                  onChange={(event) => {
                    setNickname(event.target.value)
                    setSaved(false)
                  }}
                />
              </div>
              <Button type="submit" disabled={busy || nickname.trim().length === 0}>
                {busy ? 'Đang lưu...' : 'Lưu biệt danh'}
              </Button>
              {saved ? <p className="text-sm text-muted-foreground" role="status">Đã cập nhật biệt danh.</p> : null}
              {error ? <ErrorState message={error} /> : null}
            </form>

            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Ván đấu gần đây</h2>
                <Link href="/history" className="text-sm text-primary underline-offset-4 hover:underline">
                  Xem tất cả
                </Link>
              </div>

              {games.status === 'loading' ? <LoadingState message="Đang tải ván đấu..." /> : null}
              {games.status === 'error' ? <ErrorState message="Không thể tải danh sách ván đấu. Vui lòng thử lại sau." /> : null}
              {games.status === 'ready' && games.games.length === 0 ? (
                <p className="py-4 text-sm text-muted-foreground">Bạn chưa có ván đấu nào. Hãy bắt đầu một ván mới!</p>
              ) : null}
              {games.status === 'ready' && recentGames.length > 0 ? (
                <ul className="divide-y divide-border rounded-md border border-border">
                  {recentGames.map((game) => (
                    <li key={game.gameId} className="flex items-center justify-between px-4 py-3 text-sm">
                      <Link href={`/history/${game.gameId}`} className="text-primary underline-offset-4 hover:underline">
                        {game.opponent ? `Đấu với ${game.opponent.nickname}` : 'Ván đấu với AI'}
                      </Link>
                      <span className="text-muted-foreground">{game.status}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          </>
        ) : null}
      </section>
    </main>
  )
}
