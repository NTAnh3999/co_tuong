import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

const harness = vi.hoisted(() => ({ pathname: "/" }))

vi.mock("next/navigation", () => ({
  usePathname: () => harness.pathname,
}))

import NavBar from "./NavBar"

afterEach(cleanup)

describe("NavBar", () => {
  it("renders the four main navigation links", () => {
    harness.pathname = "/"
    render(<NavBar />)

    for (const [label, href] of [
      ["Trang chủ", "/"],
      ["Chơi", "/play"],
      ["Học", "/learn"],
      ["Cá nhân", "/profile"],
    ]) {
      expect(screen.getByRole("link", { name: label })).toHaveAttribute("href", href)
    }
  })

  it("collapses to a compact back-link bar on gameplay routes", () => {
    harness.pathname = "/game/abc123"
    render(<NavBar />)

    expect(screen.queryByRole("link", { name: "Chơi" })).not.toBeInTheDocument()
    expect(screen.getByRole("link", { name: "‹ Cờ Tướng" })).toHaveAttribute("href", "/")
  })
})
