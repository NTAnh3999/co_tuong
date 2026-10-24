import { cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import LocalGamePage from "./page"

afterEach(cleanup)

function tap(square: string) {
  const node = screen.getByRole("gridcell", { name: new RegExp(`^${square}, `) })
  fireEvent.pointerDown(node, { clientX: 100, clientY: 100 })
  fireEvent.pointerUp(node, { clientX: 100, clientY: 100 })
}

describe("LOCAL-01: /play/local game page", () => {
  it("renders the board with the starting position and the red turn banner", () => {
    render(<LocalGamePage />)

    expect(screen.getByLabelText("a0, Red Chariot")).toHaveTextContent("車")
    expect(screen.getByLabelText("e9, Black General")).toHaveTextContent("將")
    expect(screen.getByRole("status")).toHaveTextContent("Đỏ đi")
    expect(screen.getByText("Chưa có nước đi")).toBeInTheDocument()
  })

  it("moves a piece tap-to-tap and records it in the move list", () => {
    render(<LocalGamePage />)

    tap("a0")
    tap("a1")

    const moves = screen.getByLabelText("Danh sách nước đi")
    expect(within(moves).getByText("a0a1")).toBeInTheDocument()
    expect(screen.getByLabelText("a1, Red Chariot")).toHaveTextContent("車")
    expect(screen.getByLabelText("a0, empty")).toBeInTheDocument()
    expect(screen.getByRole("status")).toHaveTextContent("Đen đi")
  })

  it("resigning ends the game and opens the result dialog", () => {
    render(<LocalGamePage />)

    fireEvent.click(screen.getByRole("button", { name: "Đỏ đầu hàng" }))

    const dialog = screen.getByRole("dialog")
    expect(dialog).toHaveTextContent("Đen thắng — Đầu hàng")
    expect(screen.getByRole("status")).toHaveAttribute("data-state", "finished")
  })

  it("Ván mới resets the board back to the starting position after a game", () => {
    render(<LocalGamePage />)

    tap("a0")
    tap("a1")
    fireEvent.click(screen.getByRole("button", { name: "Đen đầu hàng" }))
    fireEvent.click(screen.getByRole("button", { name: "Xem bàn cờ" }))
    fireEvent.click(screen.getByRole("button", { name: "Ván mới" }))

    expect(screen.getByLabelText("a0, Red Chariot")).toHaveTextContent("車")
    expect(screen.queryByLabelText("a1, Red Chariot")).toBeNull()
    expect(screen.getByRole("status")).toHaveTextContent("Đỏ đi")
    expect(screen.getByText("Chưa có nước đi")).toBeInTheDocument()
    expect(screen.queryByRole("dialog")).toBeNull()
  })

  it("closing the result dialog keeps it closed until a new game starts", () => {
    render(<LocalGamePage />)

    fireEvent.click(screen.getByRole("button", { name: "Hòa" }))
    expect(screen.getByRole("dialog")).toHaveTextContent("Hòa — Thỏa thuận hòa")

    fireEvent.click(screen.getByRole("button", { name: "Xem bàn cờ" }))
    expect(screen.queryByRole("dialog")).toBeNull()
    expect(screen.getByRole("status")).toHaveAttribute("data-state", "finished")
  })
})
