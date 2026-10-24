import { createInitialPosition, toFen } from "@xq/xiangqi-core"

export default function HomePage() {
  const startingFen = toFen(createInitialPosition())
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background px-6 text-foreground">
      <h1 className="text-3xl font-semibold tracking-tight">Cờ Tướng</h1>
      <p className="text-sm text-muted-foreground">
        Học chiến thuật và chơi cờ cùng bạn bè.
      </p>
      <p className="text-xs text-muted-foreground">Starting FEN: {startingFen}</p>
    </main>
  )
}
