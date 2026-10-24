import Link from "next/link"

const navigationItems = [
  { label: "Trang chủ", href: "/" },
  { label: "Chơi", href: "/play" },
  { label: "Học", href: "/learn" },
  { label: "Cá nhân", href: "/profile" },
]

export default function NavBar() {
  return (
    <header className="border-b border-input bg-white">
      <nav
        aria-label="Điều hướng chính"
        className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6"
      >
        <Link className="inline-flex min-h-11 shrink-0 items-center text-base font-bold tracking-tight sm:text-lg" href="/">
          Cờ Tướng
        </Link>
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
      </nav>
    </header>
  )
}
