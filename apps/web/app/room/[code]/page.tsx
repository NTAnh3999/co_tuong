'use client'

import { use, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createGameSocket, ApiClientError } from '@xq/api-client'
import type { RoomSnapshot } from '@xq/shared-contracts'
import { Button } from '@/components/ui/button'
import ErrorState from '@/src/components/states/ErrorState'
import LoadingState from '@/src/components/states/LoadingState'
import { useSession } from '@/src/features/session/use-session'
import { apiClient, socketOrigin } from '@/src/lib/api-client'

type RoomPageProps = { params: Promise<{ code: string }> }

export default function RoomPage({ params }: RoomPageProps) {
  const { code } = use(params)
  const router = useRouter()
  const { user, status: sessionStatus } = useSession()
  const [room, setRoom] = useState<RoomSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const socketRef = useRef<ReturnType<typeof createGameSocket> | null>(null)

  useEffect(() => {
    if (sessionStatus !== 'ready' || !user) return
    const userId = user.id
    let active = true

    async function loadRoom() {
      setLoading(true)
      setError(null)
      try {
        let snapshot = await apiClient.getRoom(code)
        if (!active) return
        const isMember = snapshot.members.some((member) => member.userId === userId)
        if (!isMember) {
          if (snapshot.status === 'WAITING' && snapshot.members.length < 2) {
            snapshot = await apiClient.joinRoom(code)
            if (!active) return
          } else if (snapshot.members.length >= 2) {
            throw new Error('Phòng đã đủ người chơi.')
          } else {
            throw new Error('Ván đấu này đã bắt đầu hoặc phòng không còn mở.')
          }
        }

        if (!active) return
        setRoom(snapshot)
        // This parameter is an origin: the REST /api/v1 prefix is not a Socket.IO namespace.
        socketRef.current = createGameSocket(socketOrigin(), {
          onConnect: () => socketRef.current?.joinRoom(snapshot.roomId),
          onRoomState: (nextRoom) => setRoom(nextRoom),
        })
      } catch (cause) {
        if (!active) return
        setError(cause instanceof ApiClientError ? cause.message : cause instanceof Error ? cause.message : 'Không thể mở phòng lúc này.')
      } finally {
        if (active) setLoading(false)
      }
    }

    void loadRoom()
    return () => {
      active = false
      socketRef.current?.disconnect()
      socketRef.current = null
    }
  }, [code, sessionStatus, user?.id])

  useEffect(() => {
    if (room?.status === 'STARTED' && room.gameId !== null) router.push(`/game/${room.gameId}`)
  }, [room, router])

  if (sessionStatus === 'error') {
    return <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col px-4 py-10"><ErrorState message="Không thể chuẩn bị tài khoản. Vui lòng tải lại trang." /></main>
  }
  if (sessionStatus === 'loading' || loading) {
    return <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col px-4 py-10"><LoadingState message="Đang vào phòng..." /></main>
  }
  if (error || !room) {
    return <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col px-4 py-10"><ErrorState message={error ?? 'Không tìm thấy phòng.'} actionLabel="Quay lại" onAction={() => router.push('/play/online')} /></main>
  }

  return (
    <main className="flex min-h-screen flex-col items-center bg-background px-4 py-10 text-foreground">
      <section className="flex w-full max-w-xl flex-col gap-6 rounded-xl border border-border p-6">
        <header className="text-center">
          <p className="text-sm text-muted-foreground">Mã phòng</p>
          <div className="mt-1 flex items-center justify-center gap-3">
            <h1 className="text-4xl font-bold tracking-widest">{room.code}</h1>
            <Button variant="outline" size="sm" onClick={() => { void navigator.clipboard?.writeText(room.code) }}>Sao chép</Button>
          </div>
        </header>

        <div className="rounded-lg bg-muted p-4 text-center">
          <p className="font-medium">{Math.floor(room.timeControl.initialMs / 60_000)} phút + {Math.floor(room.timeControl.incrementMs / 1000)} giây</p>
          <p className="mt-1 text-sm text-muted-foreground">Thời gian mỗi bên</p>
        </div>

        <ul className="flex flex-col gap-3" aria-label="Người chơi trong phòng">
          {room.members.map((member) => (
            <li key={member.userId} className="flex items-center justify-between rounded-lg border border-border p-4">
              <div>
                <span className="font-medium">{member.nickname}</span>
                {member.isHost ? <span className="ml-2 rounded bg-primary/10 px-2 py-1 text-xs text-primary">Chủ phòng</span> : null}
              </div>
              <span className="text-sm text-muted-foreground">{member.color === 'red' ? 'Đỏ' : member.color === 'black' ? 'Đen' : 'Đang chọn'}</span>
            </li>
          ))}
          {room.members.length < 2 ? <li className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">Đang chờ đối thủ...</li> : null}
        </ul>
      </section>
    </main>
  )
}
