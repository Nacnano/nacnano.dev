import { test, expect } from "@playwright/test";

// Runs only in the small-viewport "mobile" project (see playwright.config.ts);
// the hamburger is `sm:hidden`, so a desktop viewport never reveals it.
test("mobile menu traps focus and closes on Escape, restoring focus to the trigger", async ({
  page,
}) => {
  await page.goto("/");
  const open = page.getByRole("button", { name: "Open menu" });
  await expect(open).toBeVisible();
  await open.click();

  const dialog = page.getByRole("dialog", { name: "Site menu" });
  await expect(dialog).toBeVisible();

  // The panel is a full-screen overlay (`fixed inset-0`), so its box must span
  // the whole viewport. A `backdrop-filter`/transform on an ancestor would trap
  // the fixed element in that ancestor's box and shrink it — guard against that.
  const box = await dialog.boundingBox();
  const viewport = page.viewportSize();
  expect(box, "dialog should have a bounding box").not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(box!.width).toBeGreaterThanOrEqual(viewport!.width * 0.98);
  expect(box!.height).toBeGreaterThanOrEqual(viewport!.height * 0.98);

  // Focus is moved into the panel, and Tab never escapes it.
  const focusInside = () => dialog.evaluate((el) => el.contains(document.activeElement));
  await expect.poll(focusInside).toBe(true);
  await page.keyboard.press("Tab");
  await expect.poll(focusInside).toBe(true);
  await page.keyboard.press("Shift+Tab");
  await expect.poll(focusInside).toBe(true);

  // Escape closes it and hands focus back to the trigger.
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(open).toBeFocused();
});
