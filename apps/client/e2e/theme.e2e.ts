import { test, expect } from "@playwright/test";

test("theme toggle switches the document and persists across reload", async ({
  page,
}) => {
  await page.goto("/");
  const toggle = page.getByRole("button", { name: /Switch to|Toggle theme/ });
  await expect(toggle).toBeVisible();

  // The theme attribute is driven by next-themes on <html>; start from light.
  await expect(page.locator("html")).not.toHaveClass(/\bdark\b/);
  await toggle.click();
  await expect(page.locator("html")).toHaveClass(/\bdark\b/);

  // Persisted to localStorage and re-applied before paint on a fresh load.
  await page.reload();
  await expect(page.locator("html")).toHaveClass(/\bdark\b/);
});
