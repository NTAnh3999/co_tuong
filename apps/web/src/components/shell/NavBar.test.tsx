import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import NavBar from "./NavBar"

describe("NavBar", () => {
  it("renders the four main navigation links", () => {
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
})
