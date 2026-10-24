import { spawn, spawnSync, type ChildProcess } from "node:child_process"
import { rmSync } from "node:fs"
import { createServer } from "node:net"
import { resolve } from "node:path"
import { expect, test } from "@playwright/test"
import type { Browser, BrowserContext, CDPSession, Page } from "@playwright/test"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001/api/v1"
// The API-restart scenario below runs its own always-cold Next.js dev server (never warmed by an
// earlier request), where a route's first compile in dev mode can legitimately take longer than
// 20s; the other two scenarios share the suite's long-lived, already-warm webServer instead.
const NETWORK_TIMEOUT = 40_000
const CHECKMATE_MOVES = ["i0i2", "i9i8", "d0e1", "b7b5"] as const
const REPO_ROOT = resolve(process.cwd(), "../..")
const API_DIR = resolve(REPO_ROOT, "apps/api")
const WEB_DIR = resolve(REPO_ROOT, "apps/web")

async function createRoom(redContext: BrowserContext, blackContext: BrowserContext, baseURL: string) {
  const redPage = await redContext.newPage()
  const blackPage = await blackContext.newPage()
  await redPage.goto(`${baseURL}/play/online`)
  await redPage.locator('label:has(input[name="hostColor"][value="red"])').click()
  await redPage.getByRole("button", { name: "Tạo phòng" }).click()
  await expect(redPage).toHaveURL(/\/room\/[A-Z0-9]+$/, { timeout: NETWORK_TIMEOUT })
  const code = new URL(redPage.url()).pathname.split("/").at(-1)!

  await blackPage.goto(`${baseURL}/room/${code}`)
  await expect(redPage).toHaveURL(/\/game\/[^/?]+/, { timeout: NETWORK_TIMEOUT })
  await expect(blackPage).toHaveURL(/\/game\/[^/?]+/, { timeout: NETWORK_TIMEOUT })
  await expect(redPage.locator('[data-square="i0"]')).toBeVisible({ timeout: NETWORK_TIMEOUT })
  await expect(blackPage.locator('[data-square="i0"]')).toBeVisible({ timeout: NETWORK_TIMEOUT })
  const gameId = new URL(redPage.url()).pathname.split("/").at(-1)!
  return { redPage, blackPage, gameId }
}

async function makeGuestContext(browser: Browser, nickname: string, apiBaseUrl = API_BASE_URL) {
  const seed = await browser.newContext()
  const response = await seed.request.post(`${apiBaseUrl.replace(/\/+$/, "")}/sessions/guest`, { data: { nickname } })
  expect(response.ok(), `Guest session setup failed with HTTP ${response.status()}`).toBe(true)
  const storageState = await seed.storageState()
  return { seed, context: await browser.newContext({ storageState }) }
}

async function playMove(mover: Page, observer: Page, uci: string, ply: number) {
  const from = uci.slice(0, 2)
  const to = uci.slice(2, 4)
  await mover.locator(`[data-square="${from}"]`).click()
  await expect(mover.locator(`[data-square="${from}"] [data-state="selected"]`)).toHaveCount(1, { timeout: NETWORK_TIMEOUT })
  await mover.locator(`[data-square="${to}"]`).click()
  await expect(mover.locator("[data-ply]")).toHaveCount(ply, { timeout: NETWORK_TIMEOUT })
  await expect(observer.locator("[data-ply]")).toHaveCount(ply, { timeout: NETWORK_TIMEOUT })
}

async function freePort(): Promise<number> {
  const server = createServer()
  await new Promise<void>((resolveListen, reject) => {
    server.once("error", reject)
    server.listen(0, "127.0.0.1", resolveListen)
  })
  const address = server.address()
  if (address === null || typeof address === "string") throw new Error("Could not allocate a local port")
  const port = address.port
  await new Promise<void>((resolveClose, reject) => server.close((error) => error ? reject(error) : resolveClose()))
  return port
}

function waitForExitWithin(child: ChildProcess, timeoutMs: number): Promise<boolean> {
  if (child.exitCode !== null || child.signalCode !== null) return Promise.resolve(true)
  return new Promise((resolveExit) => {
    const timer = setTimeout(() => resolveExit(false), timeoutMs)
    child.once("exit", () => {
      clearTimeout(timer)
      resolveExit(true)
    })
  })
}

async function stopChild(child: ChildProcess | undefined) {
  if (child === undefined || child.exitCode !== null || child.signalCode !== null) return
  child.kill("SIGTERM")
  if (!await waitForExitWithin(child, 5_000)) {
    child.kill("SIGKILL")
    await waitForExitWithin(child, 2_000)
  }
}

async function waitForHealth(child: ChildProcess, url: string, label: string, timeoutMs = 120_000) {
  // A freshly copied, cache-less Next.js dev server's first compile can run well past 60s when the
  // machine is already busy with the preceding scenarios' browsers and processes.
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (child.exitCode !== null || child.signalCode !== null) throw new Error(`${label} exited before becoming ready`)
    try {
      const response = await fetch(url)
      if (response.ok) return
    } catch {
      // The listener is not ready yet.
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 500))
  }
  throw new Error(`${label} health check did not become ready at ${url}`)
}

function buildApi() {
  const command = process.platform === "win32" ? "pnpm.cmd" : "pnpm"
  const result = spawnSync(command, ["--filter", "@xq/api", "build"], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    shell: process.platform === "win32",
    timeout: 120_000,
  })
  if (result.status !== 0) throw new Error(`API build failed:\n${result.stdout}\n${result.stderr}`)
}

function startApi(port: number, webOrigin: string) {
  return spawn(process.execPath, [resolve(API_DIR, "dist/main.js")], {
    cwd: API_DIR,
    env: { ...process.env, PORT: String(port), WEB_ORIGIN: webOrigin },
    stdio: "ignore",
  })
}

test("CLOCK-01 SYNC-03: an online move completes once under added network latency", async ({ browser, browserName, baseURL }) => {
  test.setTimeout(90_000)
  test.skip(browserName !== "chromium", "CDP network emulation is available only in Chromium")
  const red = await makeGuestContext(browser, "T7.4-Latency-Red")
  const black = await makeGuestContext(browser, "T7.4-Latency-Black")
  let redPage: Page | undefined
  let blackPage: Page | undefined
  let cdp: CDPSession | undefined

  try {
    const game = await createRoom(red.context, black.context, baseURL!)
    redPage = game.redPage
    blackPage = game.blackPage
    cdp = await red.context.newCDPSession(redPage)
    await cdp.send("Network.enable")
    await cdp.send("Network.emulateNetworkConditions", {
      offline: false,
      latency: 600,
      downloadThroughput: 1_000_000,
      uploadThroughput: 1_000_000,
      connectionType: "cellular3g",
    })

    await playMove(redPage, blackPage, CHECKMATE_MOVES[0], 1)
    await expect(redPage.locator('[data-active="true"]')).toContainText("Đen", { timeout: NETWORK_TIMEOUT })
    await expect(blackPage.locator('[data-active="true"]')).toContainText("Đen", { timeout: NETWORK_TIMEOUT })
    const movesResponse = await red.context.request.get(`${API_BASE_URL.replace(/\/+$/, "")}/games/${game.gameId}/moves`)
    expect(movesResponse.ok()).toBe(true)
    const moveList = await movesResponse.json() as { moves: { uci: string }[] }
    expect(moveList.moves.map((move) => move.uci)).toEqual([CHECKMATE_MOVES[0]])
    const snapshotResponse = await red.context.request.get(`${API_BASE_URL.replace(/\/+$/, "")}/games/${game.gameId}`)
    expect(snapshotResponse.ok()).toBe(true)
    const snapshot = await snapshotResponse.json() as {
      clocks: { activeColor: string; redRemainingMs: number; blackRemainingMs: number } | null
    }
    expect(snapshot.clocks).toMatchObject({ activeColor: "black", blackRemainingMs: 600_000 })
    // The default room time control is 10 min + a 5s increment per move, so red's own clock can sit
    // slightly ABOVE the starting 600_000ms once its post-move increment is credited.
    expect(snapshot.clocks?.redRemainingMs).toBeGreaterThan(570_000)
    expect(snapshot.clocks?.redRemainingMs).toBeLessThanOrEqual(605_000)

    await cdp.send("Network.emulateNetworkConditions", {
      offline: false,
      latency: 0,
      downloadThroughput: -1,
      uploadThroughput: -1,
    })
    await playMove(blackPage, redPage, CHECKMATE_MOVES[1], 2)
    await expect(redPage.locator('[data-active="true"]')).toContainText("Đỏ", { timeout: NETWORK_TIMEOUT })
    await expect(blackPage.locator('[data-active="true"]')).toContainText("Đỏ", { timeout: NETWORK_TIMEOUT })
  } finally {
    await cdp?.detach()
    await Promise.all([redPage?.close(), blackPage?.close(), red.context.close(), black.context.close(), red.seed.close(), black.seed.close()])
  }
})

test("SYNC-03 DATA-01: concurrent tabs for one seat converge on one same-version move", async ({ browser, baseURL }) => {
  test.setTimeout(90_000)
  const red = await makeGuestContext(browser, "T7.4-Same-Seat-Red")
  const redTab = await browser.newContext({ storageState: await red.context.storageState() })
  const black = await makeGuestContext(browser, "T7.4-Same-Seat-Black")
  let firstPage: Page | undefined
  let secondPage: Page | undefined
  let blackPage: Page | undefined

  try {
    const game = await createRoom(red.context, black.context, baseURL!)
    firstPage = game.redPage
    blackPage = game.blackPage
    secondPage = await redTab.newPage()
    await secondPage.goto(firstPage.url())
    await expect(secondPage.locator("[data-ply]")).toHaveCount(0, { timeout: NETWORK_TIMEOUT })

    await Promise.all([firstPage, secondPage].map((page) => page.locator('[data-square="i0"]').click()))
    await Promise.all([firstPage, secondPage].map((page) =>
      expect(page.locator('[data-square="i0"] [data-state="selected"]')).toHaveCount(1, { timeout: NETWORK_TIMEOUT }),
    ))
    // Both controllers still hold the initial gameVersion here. Dispatch the destination clicks
    // together so both sockets submit their distinct move IDs with the same expectedVersion.
    await Promise.all([firstPage, secondPage].map((page) => page.locator('[data-square="i2"]').click()))
    await Promise.all([
      expect(firstPage.locator("[data-ply]")).toHaveCount(1, { timeout: NETWORK_TIMEOUT }),
      expect(secondPage.locator("[data-ply]")).toHaveCount(1, { timeout: NETWORK_TIMEOUT }),
      expect(blackPage.locator("[data-ply]")).toHaveCount(1, { timeout: NETWORK_TIMEOUT }),
    ])

    const response = await red.context.request.get(`${API_BASE_URL.replace(/\/+$/, "")}/games/${game.gameId}/moves`)
    expect(response.ok()).toBe(true)
    const moveList = await response.json() as { moves: { uci: string }[] }
    expect(moveList.moves.map((move) => move.uci)).toEqual([CHECKMATE_MOVES[0]])
    await expect(firstPage.locator("main [role=alert]")).toHaveCount(0)
    await expect(secondPage.locator("main [role=alert]")).toHaveCount(0)
    await playMove(blackPage, firstPage, CHECKMATE_MOVES[1], 2)
    await expect(secondPage.locator("[data-ply]")).toHaveCount(2, { timeout: NETWORK_TIMEOUT })
  } finally {
    await Promise.all([firstPage?.close(), secondPage?.close(), blackPage?.close(), redTab.close(), red.context.close(), black.context.close(), red.seed.close(), black.seed.close()])
  }
})

test("SYNC-03 DATA-01: clients resync and resume after the API process restarts", async ({ browser }, testInfo) => {
  test.setTimeout(360_000)
  test.skip(testInfo.project.name !== "desktop-chromium", "The process lifecycle scenario runs once in desktop Chromium")
  const apiPort = await freePort()
  const webPort = await freePort()
  const apiBaseUrl = `http://127.0.0.1:${apiPort}/api/v1`
  const webOrigin = `http://127.0.0.1:${webPort}`
  const apiHealthUrl = `http://127.0.0.1:${apiPort}/api/v1/health`
  let apiProcess: ChildProcess | undefined
  let webProcess: ChildProcess | undefined
  let isolatedDistDir: string | undefined
  let red: Awaited<ReturnType<typeof makeGuestContext>> | undefined
  let black: Awaited<ReturnType<typeof makeGuestContext>> | undefined
  let redPage: Page | undefined
  let blackPage: Page | undefined

  try {
    // This test owns an isolated API and web dev server so it can terminate the real Nest process
    // without stopping the API used by the rest of the Playwright suite.
    buildApi()
    apiProcess = startApi(apiPort, webOrigin)
    await waitForHealth(apiProcess, apiHealthUrl, "NestJS API")
    // Next dev writes build output into distDir. Point this instance at its own distDir (via
    // apps/web/next.config.ts's NEXT_DIST_DIR override) so it doesn't race the suite's configured
    // webServer, which serves the other resilience scenarios from the default .next directory.
    // Earlier attempts copied the whole source tree into a scratch directory and junctioned
    // node_modules into it, but Next's dev bundler resolves some of its own internal module paths
    // relative to the *real* node_modules location, and a Windows directory junction breaks that
    // resolution -- the server listens, but every request 500s on "Module not found" errors deep
    // in Next's own client runtime. Running straight from the real apps/web directory sidesteps
    // the issue entirely since node_modules is never relocated.
    isolatedDistDir = `.next-resilience-${process.pid}-${Date.now()}`
    const webEntrypoint = resolve(WEB_DIR, "node_modules/next/dist/bin/next")
    webProcess = spawn(process.execPath, [webEntrypoint, "dev", "--port", String(webPort)], {
      cwd: WEB_DIR,
      env: { ...process.env, NEXT_PUBLIC_API_BASE_URL: apiBaseUrl, NEXT_DIST_DIR: isolatedDistDir },
      stdio: "ignore",
    })
    await waitForHealth(webProcess, webOrigin, "Next.js dev server")

    red = await makeGuestContext(browser, "T7.4-Restart-Red", apiBaseUrl)
    black = await makeGuestContext(browser, "T7.4-Restart-Black", apiBaseUrl)
    const game = await createRoom(red.context, black.context, webOrigin)
    redPage = game.redPage
    blackPage = game.blackPage
    await playMove(redPage, blackPage, CHECKMATE_MOVES[0], 1)
    await playMove(blackPage, redPage, CHECKMATE_MOVES[1], 2)
    await playMove(redPage, blackPage, CHECKMATE_MOVES[2], 3)

    const oldApi = apiProcess
    oldApi.kill("SIGTERM")
    if (!await waitForExitWithin(oldApi, 10_000)) throw new Error("API did not exit after SIGTERM")
    await expect(redPage.locator("main [role=alert]")).toBeVisible({ timeout: NETWORK_TIMEOUT })
    await expect(blackPage.locator("main [role=alert]")).toBeVisible({ timeout: NETWORK_TIMEOUT })
    await new Promise((resolveWait) => setTimeout(resolveWait, 1_000))

    apiProcess = startApi(apiPort, webOrigin)
    await waitForHealth(apiProcess, apiHealthUrl, "Restarted NestJS API")
    await expect(redPage.locator("main [role=alert]")).toHaveCount(0, { timeout: 30_000 })
    await expect(blackPage.locator("main [role=alert]")).toHaveCount(0, { timeout: 30_000 })
    await expect(redPage.locator("[data-ply]")).toHaveCount(3, { timeout: NETWORK_TIMEOUT })
    await expect(blackPage.locator("[data-ply]")).toHaveCount(3, { timeout: NETWORK_TIMEOUT })

    await playMove(blackPage, redPage, CHECKMATE_MOVES[3], 4)
    const response = await red.context.request.get(`${apiBaseUrl}/games/${game.gameId}/moves`)
    expect(response.ok()).toBe(true)
    const moveList = await response.json() as { moves: { uci: string }[] }
    expect(moveList.moves.map((move) => move.uci)).toEqual(CHECKMATE_MOVES)
  } finally {
    await Promise.all([redPage?.close(), blackPage?.close(), red?.context.close(), black?.context.close(), red?.seed.close(), black?.seed.close()])
    await stopChild(apiProcess)
    await stopChild(webProcess)
    if (isolatedDistDir !== undefined) rmSync(resolve(WEB_DIR, isolatedDistDir), { recursive: true, force: true })
  }
})
