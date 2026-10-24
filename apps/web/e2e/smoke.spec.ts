import { expect, test } from "@playwright/test"

test("landing page loads with the primary CTA", async ({ page }) => {
  await page.goto("/")

  await expect(page.getByRole("heading", { name: "Cờ Tướng" })).toBeVisible()
  await expect(page.getByRole("link", { name: "Chơi ngay" })).toBeVisible()
})
