import { expect, test } from "@playwright/test"

test("landing page loads with the core package marker", async ({ page }) => {
  await page.goto("/")

  await expect(page.getByRole("heading", { name: "Cờ Tướng" })).toBeVisible()
  await expect(page.getByText("Core package: @xq/xiangqi-core")).toBeVisible()
})
