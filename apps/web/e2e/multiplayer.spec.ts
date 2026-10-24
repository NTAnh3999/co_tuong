import { expect, test } from "@playwright/test"
import type { Browser, BrowserContext, Page } from "@playwright/test"
import { RESULT_REASON_LABELS } from "../src/features/game/components/result-text"

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

const NETWORK_TIMEOUT = 15_000
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001/api/v1"

let redContext: BrowserContext
let blackContext: BrowserContext

test.beforeAll(async ({ browser }) => {
  redContext = await browser.newContext()
  blackContext = await browser.newContext()
  try {
    const sessions = await Promise.all([
      redContext.request.post(`${API_BASE_URL.replace(/\/+$/, "")}/sessions/guest`, { data: { nickname: "T4.8-Do" } }),
      blackContext.request.post(`${API_BASE_URL.replace(/\/+$/, "")}/sessions/guest`, { data: { nickname: "T4.8-Den" } }),
    ])
    for (const response of sessions) {
      expect(response.ok(), `Guest session setup failed with HTTP ${response.status()}`).toBe(true)
    }
  } catch (error) {
    await Promise.all([redContext.close(), blackContext.close()])
    throw error
  }
})

test.afterAll(async () => {
  await Promise.all([redContext.close(), blackContext.close()])
})

async function createRedRoom() {
  const redPage = await redContext.newPage()
  const blackPage = await blackContext.newPage()

  try {
    await redPage.goto("/play/online")
    // The radio input is visually hidden (sr-only) and wrapped by its own label with no
    // htmlFor/id association, so clicking/checking the input directly (or via getByLabel,
    // which resolves to the same covered input) gets blocked by the label intercepting the
    // click. Click the wrapping label element itself — the browser forwards that click to
    // the input it wraps, which is the normal way a sighted user would "click" this radio.
    await redPage.locator('label:has(input[name="hostColor"][value="red"])').click()
    await expect(redPage.locator('input[name="hostColor"][value="red"]')).toBeChecked()
    await redPage.getByRole("button", { name: "Tạo phòng" }).click()
    await expect(redPage).toHaveURL(/\/room\/[A-Z0-9]+$/, { timeout: NETWORK_TIMEOUT })
    const code = new URL(redPage.url()).pathname.split("/").at(-1)!

    await blackPage.goto(`/room/${code}`)
    await expect(redPage).toHaveURL(/\/game\/[^/?]+/, { timeout: NETWORK_TIMEOUT })
    await expect(blackPage).toHaveURL(/\/game\/[^/?]+/, { timeout: NETWORK_TIMEOUT })
    await expect(redPage.locator('[data-square="i0"]')).toBeVisible({ timeout: NETWORK_TIMEOUT })
    await expect(blackPage.locator('[data-square="i0"]')).toBeVisible({ timeout: NETWORK_TIMEOUT })
    await expect(redPage.locator("aside button")).toHaveCount(2, { timeout: NETWORK_TIMEOUT })
    await expect(blackPage.locator("aside button")).toHaveCount(2, { timeout: NETWORK_TIMEOUT })
    await expect(redPage.locator('[data-square="i0"]')).toHaveCSS("cursor", "grab", { timeout: NETWORK_TIMEOUT })
    await resyncPage(redPage)
    await resyncPage(blackPage)
    await expect(redPage.locator('[data-active="true"] span').last()).toHaveText(/\d{2}:\d{2}/, { timeout: NETWORK_TIMEOUT })
    await expect(blackPage.locator('[data-active="true"] span').last()).toHaveText(/\d{2}:\d{2}/, { timeout: NETWORK_TIMEOUT })
    return { redContext, blackContext, redPage, blackPage, code }
  } catch (error) {
    await Promise.all([redPage.close(), blackPage.close()])
    throw error
  }
}

async function playMove(mover: Page, observer: Page, uci: string, ply: number) {
  const from = uci.slice(0, 2)
  const to = uci.slice(2, 4)
  await mover.locator(`[data-square="${from}"]`).click()
  await expect(mover.locator(`[data-square="${from}"] [data-state="selected"]`)).toHaveCount(1, { timeout: NETWORK_TIMEOUT })
  await mover.locator(`[data-square="${to}"]`).click()

  // The mover renders optimistically; the other browser must receive the authoritative socket update.
  await expect(mover.locator("[data-ply]")).toHaveCount(ply, { timeout: NETWORK_TIMEOUT })
  await expect(observer.locator("[data-ply]")).toHaveCount(ply, { timeout: NETWORK_TIMEOUT })
}

async function resyncPage(page: Page) {
  await page.bringToFront()
  await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")))
}

test("ROOM-01 ROOM-02 SYNC-03 CLOCK-01: two players create a room, join it, and play to checkmate", async ({ browser }) => {
  // Ten alternating moves plus room/game setup, each with a real network round trip —
  // well past the default 30s test timeout even when every individual step is healthy.
  test.setTimeout(90_000)
  const { redPage, blackPage, code } = await createRedRoom()
  let thirdContext: BrowserContext | undefined

  try {
    await playMove(redPage, blackPage, CHECKMATE_MOVES[0], 1)
    await expect(redPage.locator('[data-active="true"] span').last()).toHaveText(/\d{2}:\d{2}/, { timeout: NETWORK_TIMEOUT })

    for (let index = 1; index < CHECKMATE_MOVES.length; index += 1) {
      const mover = index % 2 === 0 ? redPage : blackPage
      const observer = index % 2 === 0 ? blackPage : redPage
      await playMove(mover, observer, CHECKMATE_MOVES[index]!, index + 1)
    }

    for (const page of [redPage, blackPage]) {
      const resultDialog = page.getByRole("dialog")
      await expect(resultDialog).toBeVisible({ timeout: NETWORK_TIMEOUT })
      await expect(resultDialog.getByText(RESULT_REASON_LABELS.CHECKMATE)).toBeVisible()
    }

    thirdContext = await browser.newContext()
    const thirdPage = await thirdContext.newPage()
    await thirdPage.goto(`/room/${code}`)
    await expect(thirdPage.locator("main [role=alert]")).toBeVisible({ timeout: NETWORK_TIMEOUT })
    await expect(thirdPage).not.toHaveURL(/\/game\//)
  } finally {
    await thirdContext?.close()
    await Promise.all([redPage.close(), blackPage.close()])
  }
})

test("SYNC-03: reloading mid-game restores the position and turn", async ({ browser }) => {
  test.setTimeout(60_000)
  const { redPage, blackPage } = await createRedRoom()

  try {
    for (let index = 0; index < 3; index += 1) {
      const mover = index % 2 === 0 ? redPage : blackPage
      const observer = index % 2 === 0 ? blackPage : redPage
      await playMove(mover, observer, CHECKMATE_MOVES[index]!, index + 1)
    }

    // Three plies have been committed; black owns the next turn.
    await expect(redPage.locator("[data-ply]")).toHaveCount(3, { timeout: NETWORK_TIMEOUT })
    await blackPage.reload()
    await expect(blackPage.locator("[data-ply]")).toHaveCount(3, { timeout: NETWORK_TIMEOUT })
    await expect(blackPage.locator('[data-state="last-move"]')).toHaveCount(2)

    await playMove(blackPage, redPage, CHECKMATE_MOVES[3], 4)
  } finally {
    await Promise.all([redPage.close(), blackPage.close()])
  }
})

test("SYNC-03: a dropped connection recovers and the player can move again", async ({ browser }) => {
  // Socket.IO's own heartbeat timeout can take a while to notice a dropped connection.
  test.setTimeout(60_000)
  const { redContext: playersRedContext, redPage, blackPage } = await createRedRoom()

  try {
    await playMove(redPage, blackPage, CHECKMATE_MOVES[0], 1)
    await playersRedContext.setOffline(true)
    await expect(redPage.locator("main [role=alert]")).toBeVisible({ timeout: NETWORK_TIMEOUT })

    await playersRedContext.setOffline(false)
    await expect(redPage.locator("main [role=alert]")).toHaveCount(0, { timeout: NETWORK_TIMEOUT })

    await playMove(blackPage, redPage, CHECKMATE_MOVES[1], 2)
    await playMove(redPage, blackPage, CHECKMATE_MOVES[2], 3)
  } finally {
    await Promise.all([redPage.close(), blackPage.close()])
  }
})
