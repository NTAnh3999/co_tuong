import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import Footer from "./Footer"

describe("Footer", () => {
  it("renders the four footer links with Vietnamese labels and hrefs", () => {
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
})
