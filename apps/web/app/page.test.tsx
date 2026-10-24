import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import HomePage from "./page"

describe("home page", () => {
  it("renders the landing page and core package export", () => {
    render(<HomePage />)

    expect(screen.getByRole("heading", { name: "Cờ Tướng" })).toBeInTheDocument()
    expect(screen.getByText("Core package: @xq/xiangqi-core")).toBeInTheDocument()
  })
})
