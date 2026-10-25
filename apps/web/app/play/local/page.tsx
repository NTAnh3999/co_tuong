'use client'

import { useMemo, useState, useSyncExternalStore } from "react"
import { CASUAL_RULESET, createInitialPosition, replay, toFen } from "@xq/xiangqi-core"
import type { Piece } from "@xq/xiangqi-core"

import { Button } from "@/components/ui/button"
import { Board2D } from "@/src/features/game/board/Board2D"
import { createLocalGameController } from "@/src/features/game/controller/local-game-controller"
import type { GameController, GameControllerState } from "@/src/features/game/controller/game-controller"
import { CapturedPieces } from "@/src/features/game/components/CapturedPieces"
import { ExitToLobbyButton } from "@/src/features/game/components/ExitToLobbyButton"
import { GameStatusBanner } from "@/src/features/game/components/GameStatusBanner"
import { MoveList } from "@/src/features/game/components/MoveList"
import { ResultDialog } from "@/src/features/game/components/ResultDialog"

const STARTING_FEN = toFen(createInitialPosition())

/** Subscribes to a controller's state via useSyncExternalStore (no hand-rolled effect/state). */
function useGameControllerState(controller: GameController): GameControllerState {
  return useSyncExternalStore(controller.subscribe, controller.getState, controller.getState)
}

/** Pieces captured by each step of the game, derived by replaying the move history. */
function useCapturedPieces(history: GameControllerState["history"]): readonly Piece[] {
  return useMemo(() => {
    const steps = replay({
      initialFen: STARTING_FEN,
      moves: history,
      ruleSetVersion: CASUAL_RULESET.version,
    })
    const captured: Piece[] = []
    for (const step of steps) {
      if (step.captured !== null) captured.push(step.captured)
    }
    return captured
  }, [history])
}

export default function LocalGamePage() {
  const [controller, setController] = useState<GameController>(() => createLocalGameController())
  const [dismissed, setDismissed] = useState(false)
  const state = useGameControllerState(controller)
  const captured = useCapturedPieces(state.history)

  // Starts a fresh game: a new controller instance and the result dialog re-enabled.
  const newGame = () => {
    setController(createLocalGameController())
    setDismissed(false)
  }

  return (
    <main className="flex min-h-screen flex-col items-center gap-6 bg-background px-4 py-6 text-foreground lg:flex-row lg:items-start lg:justify-center">
      <h1 className="sr-only">Ván cờ địa phương</h1>
      <ExitToLobbyButton />
      <section className="flex w-full max-w-2xl flex-col items-center gap-3 overflow-x-auto">
        <div className="flex w-full justify-center lg:h-[calc(100vh-3rem)]">
          <Board2D
            position={state.position}
            orientation={state.orientation}
            selectedSquare={state.selectedSquare}
            legalTargets={state.legalTargets}
            lastMove={state.lastMove}
            interactive={true}
            onSquareClick={(square) => controller.selectSquare(square)}
            onMove={(move) => {
              controller.submitMove(move)
            }}
            className="w-full lg:h-full lg:w-auto"
          />
        </div>
      </section>

      <aside className="flex w-full max-w-sm flex-col gap-4">
        <GameStatusBanner turn={state.position.turn} result={state.result} orientation={state.orientation} />

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => controller.flip()}>
            Lật bàn cờ
          </Button>
          <Button variant="destructive" size="sm" onClick={() => controller.resign?.("red")} disabled={state.result !== null}>
            Đỏ đầu hàng
          </Button>
          <Button variant="destructive" size="sm" onClick={() => controller.resign?.("black")} disabled={state.result !== null}>
            Đen đầu hàng
          </Button>
          <Button variant="secondary" size="sm" onClick={() => controller.offerDraw?.()} disabled={state.result !== null}>
            Hòa
          </Button>
          <Button variant="ghost" size="sm" onClick={newGame}>
            Ván mới
          </Button>
        </div>

        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold">Nước đi</h2>
          <MoveList moves={state.history} />
        </div>

        <div className="flex flex-col gap-2">
          <CapturedPieces captured={captured} color="red" />
          <CapturedPieces captured={captured} color="black" />
        </div>
      </aside>

      <ResultDialog
        result={dismissed ? null : state.result}
        onRematch={newGame}
        onClose={() => setDismissed(true)}
      />
    </main>
  )
}
