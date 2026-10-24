import { AxeBuilder } from "@axe-core/playwright"
import { expect, test } from "@playwright/test"
import type { BrowserContext, Page } from "@playwright/test"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001/api/v1"
const NETWORK_TIMEOUT = 15_000
const CHECKMATE_MOVES = ["i0i2", "i9i8", "d0e1", "b7b5", "a3a4", "b5c5", "h2f2", "c5g5", "c3c4", "g5g0"] as const

async function createGuest(context: BrowserContext, nickname: string) {
  const response = await context.request.post(`${API_BASE_URL.replace(/\/+$/, "")}/sessions/guest`, { data: { nickname } })
  expect(response.ok(), `Guest session setup failed with HTTP ${response.status()}`).toBe(true)
}

async function auditRoute(page: Page, route: string, options: { board?: "interactive" | "static" } = {}) {
  // Routes are audited for 320px overflow and tap targets at that width, but callers that keep
  // using `page` afterward (e.g. to play moves on a board) expect its normal viewport back.
  const originalViewport = page.viewportSize()
  await page.goto(route)
  await expect(page.locator("main")).toBeVisible({ timeout: NETWORK_TIMEOUT })
  const results = await new AxeBuilder({ page }).analyze()
  expect(results.violations, `${route} axe violations: ${JSON.stringify(results.violations.map(({ id, help, nodes }) => ({ id, help, targets: nodes.map(({ target }) => target) })))}`).toEqual([])

  try {
    await page.setViewportSize({ width: 320, height: 800 })
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), { message: `${route} overflows horizontally at 320px` }).toBe(true)
    await auditAtCurrentViewport(page, route, options)
  } finally {
    if (originalViewport !== null) await page.setViewportSize(originalViewport)
  }
}

async function auditAtCurrentViewport(page: Page, route: string, options: { board?: "interactive" | "static" }) {

  const shellLinks = page.locator("nav a")
  for (let index = 0; index < await shellLinks.count(); index += 1) {
    const box = await shellLinks.nth(index).boundingBox()
    expect(box && box.width >= 44 && box.height >= 44, `${route} navigation link ${index} is smaller than 44x44: ${JSON.stringify(box)}`).toBe(true)
  }

  if (options.board === "interactive") {
    const squares = page.locator('[role="grid"] [data-square]')
    await expect(squares).toHaveCount(90)
    const boxes = await squares.evaluateAll((elements) => elements.map((element) => {
      const { width, height } = element.getBoundingClientRect()
      return { square: element.getAttribute("data-square"), width, height }
    }))
    for (const box of boxes) expect(box.width >= 44 && box.height >= 44, `${route} board square ${box.square} is smaller than 44x44: ${JSON.stringify(box)}`).toBe(true)
  }

  // Main-page buttons are the route's primary actions; shared shell links are audited separately by axe.
  const primaryActions = page.locator("main button:not([disabled])")
  for (let index = 0; index < await primaryActions.count(); index += 1) {
    const box = await primaryActions.nth(index).boundingBox()
    expect(box && box.width >= 44 && box.height >= 44, `${route} primary button ${index} is smaller than 44x44: ${JSON.stringify(box)}`).toBe(true)
  }
  const pageLinks = page.locator("main a")
  for (let index = 0; index < await pageLinks.count(); index += 1) {
    const box = await pageLinks.nth(index).boundingBox()
    expect(box && box.width >= 44 && box.height >= 44, `${route} page link ${index} is smaller than 44x44: ${JSON.stringify(box)}`).toBe(true)
  }
}

const staticRoutes = [
  "/", "/play", "/play/local", "/rules", "/privacy", "/terms", "/licenses",
]

for (const route of staticRoutes) {
  test(`${route}: axe, 320px layout, and tap targets`, async ({ page }) => {
    await auditRoute(page, route, route === "/play/local" ? { board: "interactive" } : {})
  })
}

test("seeded puzzle and lesson routes: axe, 320px layout, and board targets", async ({ page }) => {
  await createGuest(page.context(), "T7.7-Content")
  const api = API_BASE_URL.replace(/\/+$/, "")
  const [puzzleResponse, lessonResponse] = await Promise.all([
    page.context().request.get(`${api}/puzzles`),
    page.context().request.get(`${api}/lessons`),
  ])
  expect(puzzleResponse.ok(), `Puzzle fixture request failed with HTTP ${puzzleResponse.status()}`).toBe(true)
  expect(lessonResponse.ok(), `Lesson fixture request failed with HTTP ${lessonResponse.status()}`).toBe(true)
  const puzzles = await puzzleResponse.json() as Array<{ id: string }>
  const lessons = await lessonResponse.json() as Array<{ slug: string }>
  expect(puzzles.some(({ id }) => id === "classic-mate-01"), "Seeded puzzle classic-mate-01 is required").toBe(true)
  expect(lessons.length, "At least one seeded lesson is required").toBeGreaterThan(0)

  await auditRoute(page, "/play/ai")
  await auditRoute(page, "/play/online")
  await auditRoute(page, "/profile")
  await auditRoute(page, "/learn")
  await auditRoute(page, `/learn/${lessons[0]!.slug}`)
  await auditRoute(page, "/puzzles")
  await auditRoute(page, "/puzzles/classic-mate-01", { board: "interactive" })
})

test("live room, game, and replay routes: axe, 320px layout, and board targets", async ({ browser }) => {
  test.setTimeout(120_000)
  const redContext = await browser.newContext()
  const blackContext = await browser.newContext()
  const redPage = await redContext.newPage()
  const blackPage = await blackContext.newPage()
  try {
    await Promise.all([createGuest(redContext, "T7.7-Red"), createGuest(blackContext, "T7.7-Black")])
    await redPage.goto("/play/online")
    await redPage.locator('label:has(input[name="hostColor"][value="red"])').click()
    await redPage.getByRole("button", { name: "Tạo phòng" }).click()
    await expect(redPage).toHaveURL(/\/room\/[A-Z0-9]+$/, { timeout: NETWORK_TIMEOUT })
    const code = new URL(redPage.url()).pathname.split("/").at(-1)!
    await auditRoute(redPage, `/room/${code}`)

    await blackPage.goto(`/room/${code}`)
    await expect(redPage).toHaveURL(/\/game\/[^/?]+/, { timeout: NETWORK_TIMEOUT })
    await expect(blackPage).toHaveURL(/\/game\/[^/?]+/, { timeout: NETWORK_TIMEOUT })
    const gameId = new URL(redPage.url()).pathname.split("/").at(-1)!
    await auditRoute(redPage, `/game/${gameId}`, { board: "interactive" })

    for (let index = 0; index < CHECKMATE_MOVES.length; index += 1) {
      const move = CHECKMATE_MOVES[index]!
      const mover = index % 2 === 0 ? redPage : blackPage
      await mover.locator(`[data-square="${move.slice(0, 2)}"]`).click()
      await mover.locator(`[data-square="${move.slice(2, 4)}"]`).click()
      await expect(mover.locator("[data-ply]")).toHaveCount(index + 1, { timeout: NETWORK_TIMEOUT })
    }

    await auditRoute(redPage, "/history")
    await expect(redPage.locator(`a[href="/history/${gameId}"]`)).toBeVisible({ timeout: NETWORK_TIMEOUT })
    await auditRoute(redPage, `/history/${gameId}`, { board: "static" })
  } finally {
    await Promise.all([redContext.close(), blackContext.close()])
  }
})
