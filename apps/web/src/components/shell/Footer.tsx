"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const footerItems = [
  { label: "Luật chơi", href: "/rules" },
  { label: "Quyền riêng tư", href: "/privacy" },
  { label: "Điều khoản", href: "/terms" },
  { label: "Giấy phép", href: "/licenses" },
]

/** Routes that show a board full-screen: the footer's legal links would just eat space the board needs. */
function isGameplayRoute(pathname: string): boolean {
  return pathname.startsWith("/game/") || pathname.startsWith("/play/local")
}

export default function Footer() {
  const pathname = usePathname()
  if (isGameplayRoute(pathname)) return null

  return (
    <footer className="mt-auto border-t border-input bg-white">
      <nav
        aria-label="Thông tin"
        className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-4 gap-y-2 px-4 py-4 sm:px-6"
      >
        <ul className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
          {footerItems.map(({ label, href }) => (
            <li key={href}>
              <Link className="inline-flex min-h-11 min-w-11 items-center justify-center text-xs text-foreground underline-offset-4 hover:underline sm:text-sm" href={href}>
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </footer>
  )
}
