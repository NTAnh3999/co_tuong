import Link from "next/link"

import { Button } from "@/components/ui/button"

const playActions = [
  { label: "Chơi với bạn", variant: "outline" as const },
  { label: "Đấu AI", variant: "outline" as const },
]

export default function HomePage() {
  return (
    <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-background px-5 py-16 text-foreground">
      <section className="w-full max-w-3xl rounded-3xl border border-input bg-white px-6 py-14 text-center shadow-sm sm:px-12 sm:py-20">
        <p className="mb-5 text-sm font-semibold uppercase tracking-[0.24em] text-muted-foreground">
          Chiến thuật · Tập trung · Kết nối
        </p>
        <h1 className="text-5xl font-bold tracking-tight sm:text-7xl">Cờ Tướng</h1>
        <p className="mx-auto mt-5 max-w-xl text-lg leading-8 text-muted-foreground">
          Rèn chiến thuật, thử sức cùng bạn bè và khám phá những nước cờ mới.
        </p>
        <div className="mt-9 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
          <Button asChild size="lg">
            <Link href="/play">Chơi ngay</Link>
          </Button>
          {playActions.map(({ label, variant }) => (
            <Button key={label} asChild size="lg" variant={variant}>
              <Link href="/play">{label}</Link>
            </Button>
          ))}
        </div>
      </section>
    </main>
  )
}
