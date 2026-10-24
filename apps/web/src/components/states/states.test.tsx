import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import EmptyState from "./EmptyState"
import ErrorState from "./ErrorState"
import LoadingState from "./LoadingState"
import OfflineBanner from "./OfflineBanner"

afterEach(() => cleanup())

describe("LoadingState", () => {
  it("renders a default message and an optional custom message", () => {
    const { rerender } = render(<LoadingState />)
    expect(screen.getByRole("status")).toHaveTextContent("Đang tải...")

    rerender(<LoadingState message="Đang kết nối..." />)
    expect(screen.getByRole("status")).toHaveTextContent("Đang kết nối...")
  })
})

describe("EmptyState", () => {
  it("renders without an action", () => {
    render(<EmptyState message="Chưa có ván nào." />)
    expect(screen.getByText("Chưa có ván nào.")).toBeInTheDocument()
    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })

  it("renders its action and calls the callback", () => {
    const onAction = vi.fn()
    render(<EmptyState message="Chưa có ván nào." actionLabel="Tạo ván" onAction={onAction} />)

    fireEvent.click(screen.getByRole("button", { name: "Tạo ván" }))
    expect(onAction).toHaveBeenCalledOnce()
  })
})

describe("ErrorState", () => {
  it("renders without a retry action", () => {
    render(<ErrorState message="Không tải được dữ liệu." />)
    expect(screen.getByRole("alert")).toHaveTextContent("Không tải được dữ liệu.")
    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })

  it("renders retry action and calls the callback", () => {
    const onAction = vi.fn()
    render(<ErrorState message="Không tải được dữ liệu." actionLabel="Thử lại" onAction={onAction} />)

    fireEvent.click(screen.getByRole("button", { name: "Thử lại" }))
    expect(onAction).toHaveBeenCalledOnce()
  })
})

describe("OfflineBanner", () => {
  beforeEach(() => {
    Object.defineProperty(navigator, "onLine", { configurable: true, value: true })
  })

  it("is hidden while online, then responds to offline and online events", () => {
    render(<OfflineBanner />)
    expect(screen.queryByRole("status")).not.toBeInTheDocument()

    fireEvent(window, new Event("offline"))
    expect(screen.getByRole("status")).toHaveTextContent("Mất kết nối mạng")

    fireEvent(window, new Event("online"))
    expect(screen.queryByRole("status")).not.toBeInTheDocument()
  })
})
