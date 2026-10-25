import Link from 'next/link';

/** Floating close button for full-screen gameplay pages, which hide the site header entirely. */
export function ExitToLobbyButton() {
  return (
    <Link
      href="/play"
      aria-label="Thoát ra sảnh"
      className="fixed left-2 top-2 z-10 inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-border bg-white text-lg font-bold text-foreground shadow-sm transition-colors hover:bg-accent"
    >
      ✕
    </Link>
  );
}
