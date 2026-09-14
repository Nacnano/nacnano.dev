import { test, expect } from "@playwright/test";

// Runs in static mode (no Upstash), so /activity renders the honest local SEED —
// real rows, never a fabricated zero. Cursor pagination / poll-merge need a live
// store and are covered by the mergeById / readActivityFeed unit tests instead.
test("the activity feed renders the seed rows and the globe region", async ({ page }) => {
  await page.goto("/activity");

  await expect(page.getByRole("heading", { name: /activity/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Recent visits" })).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Site visits around the world" })
  ).toBeVisible();

  // Seed visits render as internal links (`/…`), never as an outbound `<a>`.
  await expect(page.locator('main a[href^="/"]').first()).toBeVisible();
});
