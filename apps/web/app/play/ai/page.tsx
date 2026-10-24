'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ApiClientError } from '@xq/api-client'
import type { CreateAiGameRequest } from '@xq/shared-contracts'
import { Button } from '@/components/ui/button'
import ErrorState from '@/src/components/states/ErrorState'
import LoadingState from '@/src/components/states/LoadingState'
import { useSession } from '@/src/features/session/use-session'
import { apiClient } from '@/src/lib/api-client'

const colors: { label: string; value: CreateAiGameRequest['color'] }[] = [
  { label: 'Đỏ', value: 'red' },
  { label: 'Đen', value: 'black' },
]

const difficulties: { label: string; value: CreateAiGameRequest['difficulty'] }[] = [
  { label: 'Dễ', value: 'easy' },
  { label: 'Vừa', value: 'medium' },
  { label: 'Khó', value: 'hard' },
]

export default function AiPlayPage() {
  const router = useRouter()
  const { user, status } = useSession()
  const [color, setColor] = useState<CreateAiGameRequest['color']>('red')
  const [difficulty, setDifficulty] = useState<CreateAiGameRequest['difficulty']>('medium')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function createGame() {
    if (status !== 'ready' || !user || busy) return
    setBusy(true)
    setError(null)
    try {
      const { gameId } = await apiClient.createAiGame({ color, difficulty })
      router.push(`/game/${gameId}`)
    } catch (cause) {
      setError(cause instanceof ApiClientError ? cause.message : 'Không thể tạo ván đấu lúc này. Vui lòng thử lại.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center bg-background px-4 py-10 text-foreground">
      <section className="flex w-full max-w-lg flex-col gap-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold">Đấu với AI</h1>
          <p className="text-sm text-muted-foreground">Chọn màu quân và độ khó để bắt đầu ván cờ.</p>
        </header>

        {status === 'loading' ? <LoadingState message="Đang chuẩn bị tài khoản..." /> : null}
        {status === 'error' || (status === 'ready' && !user)
          ? <ErrorState message="Không thể chuẩn bị tài khoản. Vui lòng tải lại trang." />
          : null}

        {status === 'ready' && user ? (
          <form className="flex flex-col gap-6" onSubmit={(event) => { event.preventDefault(); void createGame() }}>
            <fieldset className="space-y-3" disabled={busy}>
              <legend className="text-sm font-semibold">Màu quân của bạn</legend>
              <div className="flex flex-wrap gap-2">
                {colors.map((item) => (
                  <label key={item.value} className={`cursor-pointer rounded-md border px-4 py-3 text-sm ${color === item.value ? 'border-primary bg-accent' : 'border-border'}`}>
                    <input className="sr-only" type="radio" name="color" value={item.value} checked={color === item.value} onChange={() => setColor(item.value)} />
                    {item.label}
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="space-y-3" disabled={busy}>
              <legend className="text-sm font-semibold">Độ khó</legend>
              <div className="grid grid-cols-3 gap-2">
                {difficulties.map((item) => (
                  <label key={item.value} className={`cursor-pointer rounded-lg border p-3 text-center text-sm ${difficulty === item.value ? 'border-primary bg-accent' : 'border-border'}`}>
                    <input className="sr-only" type="radio" name="difficulty" value={item.value} checked={difficulty === item.value} onChange={() => setDifficulty(item.value)} />
                    {item.label}
                  </label>
                ))}
              </div>
            </fieldset>

            {error ? <ErrorState message={error} /> : null}
            <Button type="submit" disabled={busy}>
              {busy ? 'Đang tạo ván...' : 'Bắt đầu chơi'}
            </Button>
          </form>
        ) : null}
      </section>
    </main>
  )
}
