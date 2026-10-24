import Link from "next/link"

import { Button } from "@/components/ui/button"

const MODES = [
  { href: "/play/online", title: "Bạn bè", description: "Tạo phòng hoặc nhập mã phòng để chơi online cùng bạn bè." },
  { href: "/play/ai", title: "Đấu AI", description: "Thử sức với máy chơi cờ tướng." },
  { href: "/play/local", title: "Local", description: "Hai người chơi trên cùng một thiết bị." },
] as const

export default function PlayPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-6 text-foreground">
      <h1 className="text-3xl font-semibold tracking-tight">Chọn chế độ chơi</h1>
      <div className="grid w-full max-w-3xl gap-4 sm:grid-cols-3">
        {MODES.map((mode) => (
          <section
            key={mode.href}
            className="flex flex-col gap-3 rounded-lg border border-input p-5 shadow-sm"
          >
            <h2 className="text-lg font-semibold">{mode.title}</h2>
            <p className="flex-1 text-sm text-muted-foreground">{mode.description}</p>
            <Button asChild>
              <Link href={mode.href}>{mode.title}</Link>
            </Button>
          </section>
        ))}
      </div>
    </main>
  )
}
