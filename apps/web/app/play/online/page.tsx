'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ApiClientError } from '@xq/api-client'
import type { TimeControl } from '@xq/shared-contracts'
import { Button } from '@/components/ui/button'
import ErrorState from '@/src/components/states/ErrorState'
import LoadingState from '@/src/components/states/LoadingState'
import { useSession } from '@/src/features/session/use-session'
import { apiClient } from '@/src/lib/api-client'

const presets: { name: string; description: string; timeControl: TimeControl }[] = [
  { name: 'Nhanh', description: '5 phút + 3 giây', timeControl: { initialMs: 300_000, incrementMs: 3_000 } },
  { name: 'Tiêu chuẩn', description: '10 phút + 5 giây', timeControl: { initialMs: 600_000, incrementMs: 5_000 } },
  { name: 'Chậm', description: '15 phút + 10 giây', timeControl: { initialMs: 900_000, incrementMs: 10_000 } },
]

const colors = [
  { label: 'Đỏ', value: 'red' },
  { label: 'Đen', value: 'black' },
  { label: 'Ngẫu nhiên', value: 'random' },
] as const

export default function OnlinePlayPage() {
  const router = useRouter()
  const { status } = useSession()
  const [preset, setPreset] = useState('Tiêu chuẩn')
  const [hostColor, setHostColor] = useState<'red' | 'black' | 'random'>('random')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function createRoom() {
    if (status !== 'ready' || busy) return
    setBusy(true)
    setError(null)
    try {
      const selected = presets.find((item) => item.name === preset) ?? presets[1]!
      const room = await apiClient.createRoom({ timeControl: selected.timeControl, hostColor })
      router.push(`/room/${room.code}`)
    } catch (cause) {
      setError(cause instanceof ApiClientError ? cause.message : 'Không thể tạo phòng lúc này. Vui lòng thử lại.')
    } finally {
      setBusy(false)
    }
  }

  function joinRoom() {
    const normalized = code.trim().toUpperCase()
    if (normalized) router.push(`/room/${normalized}`)
  }

  return (
    <main className="flex min-h-screen flex-col items-center bg-background px-4 py-10 text-foreground">
      <section className="flex w-full max-w-lg flex-col gap-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold">Chơi trực tuyến</h1>
          <p className="text-sm text-muted-foreground">Tạo phòng riêng hoặc tham gia bằng mã phòng.</p>
        </header>

        <fieldset className="space-y-3" disabled={busy}>
          <legend className="text-sm font-semibold">Thời gian</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {presets.map((item) => (
              <label key={item.name} className={`cursor-pointer rounded-lg border p-3 ${preset === item.name ? 'border-primary bg-accent' : 'border-border'}`}>
                <input className="sr-only" type="radio" name="timeControl" value={item.name} checked={preset === item.name} onChange={() => setPreset(item.name)} />
                <span className="block font-medium">{item.name}</span>
                <span className="text-xs text-muted-foreground">{item.description}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="space-y-3" disabled={busy}>
          <legend className="text-sm font-semibold">Màu quân của bạn</legend>
          <div className="flex flex-wrap gap-2">
            {colors.map((color) => (
              <label key={color.value} className={`cursor-pointer rounded-md border px-3 py-2 text-sm ${hostColor === color.value ? 'border-primary bg-accent' : 'border-border'}`}>
                <input className="sr-only" type="radio" name="hostColor" value={color.value} checked={hostColor === color.value} onChange={() => setHostColor(color.value)} />
                {color.label}
              </label>
            ))}
          </div>
        </fieldset>

        {status === 'loading' ? <LoadingState message="Đang chuẩn bị tài khoản..." /> : null}
        {status === 'error' ? <ErrorState message="Không thể kết nối. Vui lòng tải lại trang để thử lại." /> : null}
        {error ? <ErrorState message={error} /> : null}
        <Button onClick={() => void createRoom()} disabled={status !== 'ready' || busy}>
          {busy ? 'Đang tạo phòng...' : 'Tạo phòng'}
        </Button>

        <div className="flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />hoặc<span className="h-px flex-1 bg-border" /></div>

        <form className="flex flex-col gap-2" onSubmit={(event) => { event.preventDefault(); joinRoom() }}>
          <label className="text-sm font-semibold" htmlFor="room-code">Nhập mã phòng</label>
          <div className="flex gap-2">
            <input
              id="room-code"
              className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm uppercase"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="MÃ PHÒNG"
              autoComplete="off"
            />
            <Button type="submit" variant="outline" disabled={!code.trim()}>Tham gia</Button>
          </div>
        </form>
      </section>
    </main>
  )
}
