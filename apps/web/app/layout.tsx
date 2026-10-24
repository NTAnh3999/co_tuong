import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Cờ Tướng",
  description: "Học và chơi cờ tướng.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  )
}
