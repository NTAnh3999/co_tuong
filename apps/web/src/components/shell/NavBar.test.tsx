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

  it("renders nothing on gameplay routes, leaving room for the board", () => {
    harness.pathname = "/game/abc123"
    const { container } = render(<NavBar />)
    expect(container).toBeEmptyDOMElement()
  })
})
