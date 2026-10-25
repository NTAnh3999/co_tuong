'use client'

import { Suspense, use, useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CASUAL_RULESET, createInitialPosition, replay, toFen } from '@xq/xiangqi-core'
import type { Color, Piece } from '@xq/xiangqi-core'
import type { RejectReason } from '@xq/shared-contracts'
import type { GameSnapshot } from '@xq/shared-contracts'
import { requestRematchResponseSchema } from '@xq/shared-contracts'
import { Button } from '@/components/ui/button'
import ErrorState from '@/src/components/states/ErrorState'
import LoadingState from '@/src/components/states/LoadingState'
import { CapturedPieces } from '@/src/features/game/components/CapturedPieces'
import { ClockDisplay } from '@/src/features/game/components/ClockDisplay'
import { ExitToLobbyButton } from '@/src/features/game/components/ExitToLobbyButton'
import { GameStatusBanner } from '@/src/features/game/components/GameStatusBanner'
import { MoveList } from '@/src/features/game/components/MoveList'
import { OpponentPresenceBanner } from '@/src/features/game/components/OpponentPresenceBanner'
import { ResultDialog } from '@/src/features/game/components/ResultDialog'
import { Board2D } from '@/src/features/game/board/Board2D'
import { createOnlineGameController } from '@/src/features/game/controller/online-game-controller'
import type { OnlineGameController, OnlineGameControllerState } from '@/src/features/game/controller/online-game-controller'
import { useSession } from '@/src/features/session/use-session'
import { apiClient, socketOrigin } from '@/src/lib/api-client'

type GamePageProps = { params: Promise<{ id: string }> }
const STARTING_FEN = toFen(createInitialPosition())
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001/api/v1'

function useCapturedPieces(history: OnlineGameControllerState['history']): readonly Piece[] {
  return useMemo(() => {
    const steps = replay({ initialFen: STARTING_FEN, moves: history, ruleSetVersion: CASUAL_RULESET.version })
    return steps.flatMap((step) => step.captured === null ? [] : [step.captured])
  }, [history])
}

function rejectionText(reason: RejectReason): string {
  const labels: Record<RejectReason, string> = {
    VERSION_CONFLICT: 'Trạng thái ván cờ đã thay đổi. Đang đồng bộ lại.',
    NOT_YOUR_TURN: 'Chưa đến lượt của bạn.',
    ILLEGAL_MOVE: 'Nước đi không hợp lệ.',
    GAME_NOT_ACTIVE: 'Ván cờ đã kết thúc.',
    NOT_A_PLAYER: 'Bạn không phải người chơi trong ván này.',
    TIME_EXPIRED: 'Đã hết thời gian.',
    MOVE_ID_CONFLICT: 'Nước đi bị trùng lặp.',
    RATE_LIMITED: 'Bạn thao tác quá nhanh. Vui lòng thử lại.',
  }
  return labels[reason] ?? 'Nước đi bị từ chối.'
}

export default function OnlineGamePage({ params }: GamePageProps) {
  return <Suspense fallback={<main className="mx-auto flex min-h-screen w-full max-w-xl px-4 py-10"><LoadingState message="Đang tải ván cờ..." /></main>}><ResolvedOnlineGamePage params={params} /></Suspense>
}

function ResolvedOnlineGamePage({ params }: GamePageProps) {
  const { id } = use(params)
  const roomCode = useSearchParams().get('room')
  const { user, status } = useSession()

  if (status === 'loading') return <main className="mx-auto flex min-h-screen w-full max-w-xl px-4 py-10"><LoadingState message="Đang tải ván cờ..." /></main>
  if (status === 'error' || !user) return <main className="mx-auto flex min-h-screen w-full max-w-xl px-4 py-10"><ErrorState message="Không thể chuẩn bị tài khoản. Vui lòng tải lại trang." /></main>
  return <ReadyOnlineGame gameId={id} userId={user.id} roomCode={roomCode} />
}

function ReadyOnlineGame({ gameId, userId, roomCode }: { gameId: string; userId: string; roomCode: string | null }) {
  const router = useRouter()
  const [controller] = useState<OnlineGameController>(() => createOnlineGameController(gameId, socketOrigin()))
  const [snapshot, setSnapshot] = useState<GameSnapshot | null>(null)
  const [snapshotError, setSnapshotError] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [showRejection, setShowRejection] = useState(false)
  const [waitingForRematch, setWaitingForRematch] = useState(false)
  const state = useSyncExternalStore(controller.subscribe, controller.getState, controller.getState)
  const captured = useCapturedPieces(state.history)

  useEffect(() => {
    controller.connect()
    return () => controller.dispose()
  }, [controller])

  useEffect(() => {
    if (state.lastRejection === null) return
    setShowRejection(true)
    const timeout = window.setTimeout(() => setShowRejection(false), 4000)
    return () => window.clearTimeout(timeout)
  }, [state.lastRejection])

  useEffect(() => {
    let active = true
    const refresh = async () => {
      try {
        const next = await apiClient.getGame(gameId)
        if (active) {
          setSnapshot(next)
          setSnapshotError(false)
        }
      } catch {
        if (active) setSnapshotError(true)
      }
    }
    void refresh()
    const interval = window.setInterval(() => { void refresh() }, 3000)
    return () => {
      active = false
      window.clearInterval(interval)
    }
  }, [gameId])

  useEffect(() => {
    if (!waitingForRematch || !roomCode) return
    let active = true
    const poll = async () => {
      try {
        const room = await apiClient.getRoom(roomCode)
        if (active && room.gameId !== null && room.gameId !== gameId) {
          router.push(`/game/${room.gameId}?room=${encodeURIComponent(roomCode)}`)
        }
      } catch {
        // Continue polling; a transient network failure should not lose the rematch request.
      }
    }
    const interval = window.setInterval(() => { void poll() }, 2000)
    return () => {
      active = false
      window.clearInterval(interval)
    }
  }, [gameId, roomCode, router, waitingForRematch])

  const myColor: Color | null = snapshot === null
    ? null
    : snapshot.redPlayerId === userId ? 'red'
      : snapshot.blackPlayerId === userId ? 'black' : null
  const orientation = myColor ?? state.orientation
  const interactive = myColor !== null && myColor === state.position.turn && state.result === null && state.connectionStatus === 'connected'
  const drawOfferBy = snapshot?.drawOfferBy ?? null
  const opponentColor: Color | null = myColor === 'red' ? 'black' : myColor === 'black' ? 'red' : null
  const opponentPresence = opponentColor ? state.presence?.[opponentColor] ?? null : null

  const respondToDraw = async (action: 'accept' | 'decline') => {
    if (myColor === null) return
    setActionError(null)
    try {
      setSnapshot(await apiClient.offerDraw(gameId, { action }))
    } catch {
      setActionError('Không thể phản hồi đề nghị hòa. Vui lòng thử lại.')
    }
  }

  const requestRematch = async () => {
    if (!roomCode) return
    setActionError(null)
    try {
      const response = await fetch(`${API_BASE_URL.replace(/\/+$/, '')}/rooms/${encodeURIComponent(roomCode)}/rematch`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      })
      if (!response.ok) throw new Error('Rematch request failed')
      const room = requestRematchResponseSchema.parse(await response.json())
      if (room.gameId !== null && room.gameId !== gameId) {
        router.push(`/game/${room.gameId}?room=${encodeURIComponent(roomCode)}`)
        return
      }
      setWaitingForRematch(true)
    } catch {
      setActionError('Không thể yêu cầu chơi lại. Vui lòng thử lại.')
    }
  }

  if (snapshotError && snapshot === null) {
    return <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col gap-4 px-4 py-10"><ErrorState message="Không thể tải thông tin ván cờ." /></main>
  }

  return (
    <main className="flex min-h-screen flex-col items-center gap-6 bg-background px-4 py-6 text-foreground lg:flex-row lg:items-start lg:justify-center">
      <h1 className="sr-only">Ván cờ trực tuyến</h1>
      <ExitToLobbyButton />
      <section className="flex w-full max-w-2xl flex-col items-center gap-3 overflow-x-auto">
        {state.connectionStatus === 'disconnected' && <p role="alert" className="w-full rounded-md bg-amber-100 px-4 py-3 text-center text-sm text-amber-950">Mất kết nối, đang thử kết nối lại...</p>}
        {state.connectionStatus === 'connected' && state.result === null && opponentPresence !== null && !opponentPresence.connected && opponentPresence.disconnectedAt !== null && (
          <OpponentPresenceBanner disconnectedAt={opponentPresence.disconnectedAt} onClaimWin={() => controller.claimWin()} />
        )}
        {showRejection && state.lastRejection && <p role="status" className="text-sm text-destructive">{rejectionText(state.lastRejection.reason)}</p>}
        <div className="flex w-full justify-center lg:h-[calc(100vh-3rem)]">
          <Board2D
            position={state.position}
            orientation={orientation}
            selectedSquare={state.selectedSquare}
            legalTargets={state.legalTargets}
            lastMove={state.lastMove}
            interactive={interactive}
            onSquareClick={(square) => controller.selectSquare(square)}
            onMove={(move) => { controller.submitMove(move) }}
            className="w-full lg:h-full lg:w-auto"
          />
        </div>
      </section>

      <aside className="flex w-full max-w-sm flex-col gap-4">
        <ClockDisplay clocks={state.clocks} orientation={orientation} />
        <GameStatusBanner turn={state.position.turn} result={state.result} orientation={orientation} />

        {myColor !== null && <div className="flex flex-wrap gap-2">
          <Button variant="destructive" size="sm" onClick={() => controller.resign?.(myColor)} disabled={state.result !== null}>Đầu hàng</Button>
          <Button variant="secondary" size="sm" onClick={() => controller.offerDraw?.()} disabled={state.result !== null || drawOfferBy !== null}>Cầu hòa</Button>
        </div>}

        {myColor !== null && drawOfferBy !== null && drawOfferBy !== myColor && state.result === null && <div role="group" aria-label="Đề nghị hòa" className="flex flex-col gap-2 rounded-md border border-border p-3">
          <p>Đối thủ đề nghị hòa</p>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => { void respondToDraw('accept') }}>Chấp nhận</Button>
            <Button size="sm" variant="outline" onClick={() => { void respondToDraw('decline') }}>Từ chối</Button>
          </div>
        </div>}
        {actionError && <p role="alert" className="text-sm text-destructive">{actionError}</p>}
        {waitingForRematch && <p role="status" className="text-sm text-muted-foreground">Đang chờ đối thủ đồng ý chơi lại...</p>}

        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold">Nước đi</h2>
          <MoveList moves={state.history} />
        </div>
        <div className="flex flex-col gap-2">
          <CapturedPieces captured={captured} color="red" />
          <CapturedPieces captured={captured} color="black" />
        </div>
      </aside>

      <ResultDialog result={dismissed ? null : state.result} onRematch={roomCode ? requestRematch : undefined} onClose={() => setDismissed(true)} />
    </main>
  )
}
