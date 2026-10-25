import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

const harness = vi.hoisted(() => ({ pathname: "/" }))

vi.mock("next/navigation", () => ({
  usePathname: () => harness.pathname,
}))

import Footer from "./Footer"

afterEach(cleanup)

describe("Footer", () => {
  it("renders the four footer links with Vietnamese labels and hrefs", () => {
    harness.pathname = "/"
    render(<Footer />)

    for (const [label, href] of [
      ["Luật chơi", "/rules"],
      ["Quyền riêng tư", "/privacy"],
      ["Điều khoản", "/terms"],
      ["Giấy phép", "/licenses"],
    ]) {
      expect(screen.getByRole("link", { name: label })).toHaveAttribute("href", href)
    }
  })

  it("renders nothing on gameplay routes, leaving room for the board", () => {
    harness.pathname = "/play/local"
    const { container } = render(<Footer />)
    expect(container).toBeEmptyDOMElement()
  })
})
