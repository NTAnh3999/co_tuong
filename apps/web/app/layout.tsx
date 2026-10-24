import type { Metadata } from "next"
import NavBar from "@/src/components/shell/NavBar"
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
      <body>
        <NavBar />
        {children}
      </body>
    </html>
  )
}
