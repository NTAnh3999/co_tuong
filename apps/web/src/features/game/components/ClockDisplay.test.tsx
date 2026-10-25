import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ClockDisplay } from './ClockDisplay'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('CLOCK-01: ClockDisplay', () => {
  it('renders both remaining times', () => {
    render(<ClockDisplay clocks={{ redRemainingMs: 125_000, blackRemainingMs: 90_000, activeColor: 'red', turnStartedAt: Date.now() }} orientation="red" />)
    expect(screen.getByLabelText('Đỏ: 02:05')).toBeInTheDocument()
    expect(screen.getByLabelText('Đen: 01:30')).toBeInTheDocument()
  })

  it('decreases the active color time as local presentation time advances', () => {
    vi.useFakeTimers()
    const now = Date.now()
    render(<ClockDisplay clocks={{ redRemainingMs: 125_000, blackRemainingMs: 90_000, activeColor: 'red', turnStartedAt: now }} orientation="red" />)

    expect(screen.getByLabelText('Đỏ: 02:05')).toBeInTheDocument()
    act(() => { vi.advanceTimersByTime(3000) })
    expect(screen.getByLabelText('Đỏ: 02:02')).toBeInTheDocument()
    expect(screen.getByLabelText('Đen: 01:30')).toBeInTheDocument()
  })

  it('renders a placeholder for an untimed game', () => {
    render(<ClockDisplay clocks={null} orientation="black" />)
    expect(screen.getByLabelText('Đồng hồ')).toHaveTextContent('—')
  })

  it('freezes the active color\'s time and shows a pause indicator while paused', () => {
    vi.useFakeTimers()
    const now = Date.now()
    render(<ClockDisplay clocks={{ redRemainingMs: 125_000, blackRemainingMs: 90_000, activeColor: 'red', turnStartedAt: now, paused: true }} orientation="red" />)

    expect(screen.getByLabelText('Đỏ: 02:05 (tạm dừng, đối phương mất kết nối)')).toHaveTextContent('⏸ 02:05')
    act(() => { vi.advanceTimersByTime(10_000) })
    expect(screen.getByLabelText('Đỏ: 02:05 (tạm dừng, đối phương mất kết nối)')).toHaveTextContent('⏸ 02:05')
    expect(screen.getByLabelText('Đen: 01:30')).toBeInTheDocument()
  })
})
