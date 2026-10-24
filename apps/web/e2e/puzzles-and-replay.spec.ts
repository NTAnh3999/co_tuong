import { expect, test } from "@playwright/test"
import type { BrowserContext, Page } from "@playwright/test"
import { RESULT_REASON_LABELS } from "../src/features/game/components/result-text"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001/api/v1"
const NETWORK_TIMEOUT = 15_000
const CHECKMATE_MOVES = [
  "i0i2",
  "i9i8",
  "d0e1",
  "b7b5",
  "a3a4",
  "b5c5",
  "h2f2",
  "c5g5",
  "c3c4",
  "g5g0",
] as const

async function createGuest(context: BrowserContext, nickname: string) {
  const response = await context.request.post(`${API_BASE_URL.replace(/\/+$/, "")}/sessions/guest`, {
    data: { nickname },
  })
  expect(response.ok(), `Guest session setup failed with HTTP ${response.status()}`).toBe(true)
}

async function playMove(page: Page, uci: string, ply: number) {
  await page.locator(`[data-square="${uci.slice(0, 2)}"]`).click()
  await page.locator(`[data-square="${uci.slice(2, 4)}"]`).click()
  await expect(page.locator("[data-ply]")).toHaveCount(ply, { timeout: NETWORK_TIMEOUT })
}

test("solves a seeded puzzle through the live puzzle API and board", async ({ page }) => {
  await createGuest(page.context(), "T7.5-Puzzle")

  const puzzleList = await page.context().request.get(`${API_BASE_URL.replace(/\/+$/, "")}/puzzles`)
  expect(puzzleList.ok()).toBe(true)
  const puzzles = await puzzleList.json() as Array<{ id: string }>
  expect(puzzles.some(({ id }) => id === "classic-mate-01")).toBe(true)

  await page.goto("/puzzles")
  const puzzleLink = page.locator('a[href="/puzzles/classic-mate-01"]')
  await expect(puzzleLink).toBeVisible()
  await puzzleLink.click()
  await expect(page).toHaveURL(/\/puzzles\/classic-mate-01$/)
  await expect(page.locator('[data-square="c6"]')).toHaveAttribute("aria-label", "c6, Red Chariot")

  await page.locator('[data-square="c6"]').click()
  await page.locator('[data-square="c9"]').click()
  await expect(page.getByRole("status")).toContainText("Đúng!")
  await expect(page.locator('[data-square="c9"]')).toHaveAttribute("aria-label", "c9, Red Chariot")
})

test("replays a finished online game from history", async ({ browser }) => {
  test.setTimeout(120_000)
  const redContext = await browser.newContext()
  const blackContext = await browser.newContext()
  const redPage = await redContext.newPage()
  const blackPage = await blackContext.newPage()

  try {
    await Promise.all([
      createGuest(redContext, "T7.5-Replay-Do"),
      createGuest(blackContext, "T7.5-Replay-Den"),
    ])

    await redPage.goto("/play/online")
    await redPage.locator('label:has(input[name="hostColor"][value="red"])').click()
    await redPage.getByRole("button", { name: "Tạo phòng" }).click()
    await expect(redPage).toHaveURL(/\/room\/[A-Z0-9]+$/, { timeout: NETWORK_TIMEOUT })
    const code = new URL(redPage.url()).pathname.split("/").at(-1)!

    await blackPage.goto(`/room/${code}`)
    await expect(redPage).toHaveURL(/\/game\/[^/?]+/, { timeout: NETWORK_TIMEOUT })
    await expect(blackPage).toHaveURL(/\/game\/[^/?]+/, { timeout: NETWORK_TIMEOUT })
    const gameId = new URL(redPage.url()).pathname.split("/").at(-1)!
    await expect(redPage.locator('[data-square="i0"]')).toBeVisible({ timeout: NETWORK_TIMEOUT })

    await playMove(redPage, CHECKMATE_MOVES[0], 1)
    for (let index = 1; index < CHECKMATE_MOVES.length; index += 1) {
      await playMove(index % 2 === 0 ? redPage : blackPage, CHECKMATE_MOVES[index]!, index + 1)
    }
    for (const playerPage of [redPage, blackPage]) {
      const resultDialog = playerPage.getByRole("dialog")
      await expect(resultDialog).toBeVisible({ timeout: NETWORK_TIMEOUT })
      await expect(resultDialog.getByText(RESULT_REASON_LABELS.CHECKMATE)).toBeVisible()
    }

    await redPage.goto("/history")
    const replayLink = redPage.locator(`a[href="/history/${gameId}"]`)
    await expect(replayLink).toBeVisible({ timeout: NETWORK_TIMEOUT })
    await replayLink.click()
    await expect(redPage).toHaveURL(new RegExp(`/history/${gameId}$`))

    const stepper = redPage.getByRole("slider")
    await expect(stepper).toHaveAttribute("max", String(CHECKMATE_MOVES.length))
    await stepper.focus()
    await stepper.press("Home")
    await expect(redPage.getByText(/0 \/ 10/)).toBeVisible()
    await expect(redPage.locator('[data-square="i0"]')).toHaveAttribute("aria-label", "i0, Red Chariot")
    await stepper.press("ArrowRight")
    await stepper.press("ArrowRight")
    await expect(redPage.getByText(/2 \/ 10/)).toBeVisible()
    await expect(redPage.locator('[data-square="i2"]')).toHaveAttribute("aria-label", "i2, Red Chariot")
    await expect(redPage.locator('[data-square="i8"]')).toHaveAttribute("aria-label", "i8, Black Chariot")
  } finally {
    await Promise.all([redContext.close(), blackContext.close()])
  }
})
