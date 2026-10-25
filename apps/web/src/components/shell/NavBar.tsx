"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const navigationItems = [
  { label: "Trang chủ", href: "/" },
  { label: "Chơi", href: "/play" },
  { label: "Học", href: "/learn" },
  { label: "Cá nhân", href: "/profile" },
]

/** Routes that show a board full-screen: the full menu would just eat space the board needs. */
function isGameplayRoute(pathname: string): boolean {
  return pathname.startsWith("/game/") || pathname.startsWith("/play/local")
}

export default function NavBar() {
  const pathname = usePathname()
  const compact = isGameplayRoute(pathname)

  return (
    <header className="border-b border-input bg-white">
      <nav
        aria-label="Điều hướng chính"
        className={`mx-auto flex max-w-6xl items-center gap-3 px-4 sm:px-6 ${compact ? "min-h-11 justify-start" : "min-h-16 justify-between"}`}
      >
        <Link className="inline-flex min-h-11 shrink-0 items-center text-base font-bold tracking-tight sm:text-lg" href="/">
          {compact ? "‹ Cờ Tướng" : "Cờ Tướng"}
        </Link>
        {!compact && (
          <ul className="flex items-center gap-1 sm:gap-3">
            {navigationItems.map(({ label, href }) => (
              <li key={href}>
                <Link
                  className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md px-2 text-xs font-medium text-foreground transition-colors hover:bg-accent sm:px-3 sm:text-sm"
                  href={href}
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </nav>
    </header>
  )
}
