'use client'

import { useEffect, useState } from 'react'
import type { Color } from '@xq/xiangqi-core'
import type { ClockState } from '@xq/shared-contracts'

export interface ClockDisplayProps {
  readonly clocks: ClockState | null
  readonly orientation: Color
}

function formatTime(milliseconds: number): string {
  const seconds = Math.ceil(Math.max(0, milliseconds) / 1000)
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
}

export function ClockDisplay({ clocks, orientation }: ClockDisplayProps) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(interval)
  }, [])

  if (clocks === null) {
    return <div aria-label="Đồng hồ" className="text-center text-2xl font-mono">—</div>
  }

  const elapsed = Math.max(0, now - clocks.turnStartedAt)
  const times: Record<Color, number> = {
    red: clocks.redRemainingMs - (clocks.activeColor === 'red' ? elapsed : 0),
    black: clocks.blackRemainingMs - (clocks.activeColor === 'black' ? elapsed : 0),
  }
  const topColor: Color = orientation === 'red' ? 'black' : 'red'
  const bottomColor: Color = orientation === 'red' ? 'red' : 'black'

  return (
    <div aria-label="Đồng hồ" className="flex flex-col gap-2">
      {[topColor, bottomColor].map((color) => (
        <div
          key={color}
          aria-label={`${color === 'red' ? 'Đỏ' : 'Đen'}: ${formatTime(times[color])}`}
          aria-current={clocks.activeColor === color ? 'true' : undefined}
          data-active={clocks.activeColor === color ? 'true' : 'false'}
          className={`flex justify-between rounded-md px-3 py-2 font-mono text-xl ${clocks.activeColor === color ? 'bg-primary/10 font-bold' : 'bg-muted'}`}
        >
          <span className="font-sans text-sm">{color === 'red' ? 'Đỏ' : 'Đen'}</span>
          <span>{formatTime(times[color])}</span>
        </div>
      ))}
    </div>
  )
}
