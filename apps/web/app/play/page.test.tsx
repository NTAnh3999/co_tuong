import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import PlayPage from "./page"

describe("WEB-01: /play mode picker", () => {
  it("renders the three mode links with the correct hrefs", () => {
    render(<PlayPage />)

    expect(screen.getByRole("link", { name: "Bạn bè" })).toHaveAttribute("href", "/play/online")
    expect(screen.getByRole("link", { name: "Đấu AI" })).toHaveAttribute("href", "/play/ai")
    expect(screen.getByRole("link", { name: "Local" })).toHaveAttribute("href", "/play/local")
  })
})
