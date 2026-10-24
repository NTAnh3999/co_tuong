import { expect, test } from "@playwright/test"
import { RESULT_REASON_LABELS } from "../src/features/game/components/result-text"

// Derived from createInitialPosition() and verified with @xq/xiangqi-core.
// Reproduce with: node node_modules/.pnpm/tsx@4.23.15/node_modules/tsx/dist/cli.mjs apps/web/scripts/find-mate-sequence.ts
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

test("plays a full local game to checkmate", async ({ page }) => {
  await page.goto("/play/local")

  for (const uci of CHECKMATE_MOVES) {
    const from = uci.slice(0, 2)
    const to = uci.slice(2, 4)
    await page.locator(`[data-square="${from}"]`).click()
    await page.locator(`[data-square="${to}"]`).click()
  }

  const resultDialog = page.getByRole("dialog")
  await expect(resultDialog).toBeVisible()
  await expect(resultDialog.getByText(RESULT_REASON_LABELS.CHECKMATE)).toBeVisible()
  await expect(page.locator('[data-ply]')).toHaveCount(CHECKMATE_MOVES.length)
})
