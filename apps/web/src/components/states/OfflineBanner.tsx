"use client"

import { useEffect, useState } from "react"

export default function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false)

  useEffect(() => {
    const updateStatus = () => setIsOffline(!navigator.onLine)
    const handleOffline = () => setIsOffline(true)
    const handleOnline = () => setIsOffline(false)

    updateStatus()
    window.addEventListener("offline", handleOffline)
    window.addEventListener("online", handleOnline)

    return () => {
      window.removeEventListener("offline", handleOffline)
      window.removeEventListener("online", handleOnline)
    }
  }, [])

  if (!isOffline) return null

  return (
    <div className="bg-foreground px-4 py-2 text-center text-sm text-background" role="status">
      Mất kết nối mạng. Một số tính năng có thể chưa hoạt động.
    </div>
  )
}
