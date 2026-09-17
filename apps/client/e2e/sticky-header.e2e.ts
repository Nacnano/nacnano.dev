import { test, expect, type Page } from "@playwright/test";

/**
 * The header is `sticky top-0` and is the one persistent piece of chrome, so it
 * floats over the viewport for the whole read. The old bug: navigating between
 * pages (or firing the skip-to-content jump) scrolled the document to the very
 * top, and the first lines of page content came to rest *underneath* the pinned
 * header — visible in the DOM but hidden from the reader.
 *
 * The fix lives in CSS: `scroll-padding-top` on the root scroll box reserves a
 * band the height of the header, so every scroll-to-top / scroll-into-view
 * lands clear of it. These tests guard that contract at the browser boundary —
 * the only place hydration, sticky positioning, and real scroll offsets exist.
 */

// A hairline of tolerance: sub-pixel rounding on fractional device pixels.
const EPSILON = 1;

// How close to the top a client-side navigation is expected to settle. Not
// pinned to 0: focusing the newly-mounted route can nudge the scroll box by a
// few pixels while honouring `scroll-padding-top`. Anything past this means the
// reader did not actually arrive at the top of the page.
const NEAR_TOP = 24;

async function headerBox(page: Page) {
  const header = page.getByRole("banner");
  await expect(header).toBeVisible();
  const box = await header.boundingBox();
  expect(box, "header should have a measurable box").not.toBeNull();
  return box!;
}

async function scrollPaddingTop(page: Page) {
  return page.evaluate(() =>
    parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop || "0")
  );
}

test.describe("sticky header scroll offset", () => {
  test("the root reserves scroll space at least as tall as the header", async ({
    page,
  }) => {
    await page.goto("/");
    const header = await headerBox(page);
    const padding = await scrollPaddingTop(page);

    // The whole fix in one assertion: if `scroll-pt-*` is dropped from the
    // root, padding collapses to 0 and this goes red.
    expect(
      padding,
      "root scroll-padding-top must clear the sticky header"
    ).toBeGreaterThanOrEqual(header.height - EPSILON);
  });

  test("the header is pinned to the top of the viewport when scrolled", async ({
    page,
  }) => {
    await page.goto("/blogs/dating-app");
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    // Confirm we are actually scrolled, otherwise a rect.top of 0 is meaningless.
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);

    const header = page.getByRole("banner");
    const position = await header.evaluate((el) => getComputedStyle(el).position);
    expect(position).toBe("sticky");

    const box = await header.boundingBox();
    expect(box!.y, "sticky header stays glued to the viewport top").toBeCloseTo(0, 0);
  });

  test("opening another page from a scrolled position never hides content under the header", async ({
    page,
  }) => {
    // Start deep in a long page, then navigate via the header nav — the exact
    // flow the reader reported.
    await page.goto("/blogs/dating-app");
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    await page.getByRole("link", { name: "Projects" }).click();
    await page.waitForURL("**/projects");

    // Back at the top of the new page...
    await expect
      .poll(() => page.evaluate(() => window.scrollY), { timeout: 5_000 })
      .toBeLessThanOrEqual(NEAR_TOP);

    // ...the first slice of real content sits below the header, not behind it.
    const header = await headerBox(page);
    const firstTop = await page.evaluate(() => {
      const main = document.getElementById("main");
      const target = main?.firstElementChild;
      return target ? target.getBoundingClientRect().top : Number.NaN;
    });
    expect(
      firstTop,
      "first content must not be covered by the sticky header"
    ).toBeGreaterThanOrEqual(header.height - EPSILON);
  });

  test("the skip-to-content jump lands clear of the header", async ({ page }) => {
    await page.goto("/blogs/dating-app");

    // Freeze the smooth scroll so the jump resolves synchronously and the
    // measured offset is the resting one, not an in-flight frame.
    await page.addStyleTag({
      content: "html{scroll-behavior:auto!important}",
    });

    // A long page first, so the jump actually has somewhere to travel.
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    await page.getByRole("link", { name: /skip to content/i }).press("Enter");

    const header = await headerBox(page);
    const mainTop = await page.evaluate(() => {
      const main = document.getElementById("main");
      return main ? main.getBoundingClientRect().top : Number.NaN;
    });

    expect(
      mainTop,
      "skip-to-content must stop below the header, not under it"
    ).toBeGreaterThanOrEqual(header.height - EPSILON);
  });
});
