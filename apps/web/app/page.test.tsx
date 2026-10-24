import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import HomePage from "./page"

describe("home page", () => {
  it("renders the landing title, tagline, and three play actions", () => {
    render(<HomePage />)

    expect(screen.getByRole("heading", { name: "Cờ Tướng" })).toBeInTheDocument()
    expect(screen.getByText(/Rèn chiến thuật/)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Chơi ngay" })).toHaveAttribute("href", "/play")
    expect(screen.getByRole("link", { name: "Chơi với bạn" })).toHaveAttribute("href", "/play")
    expect(screen.getByRole("link", { name: "Đấu AI" })).toHaveAttribute("href", "/play")
  })
})
