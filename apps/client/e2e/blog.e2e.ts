import { test, expect } from "@playwright/test";

test("a blog post renders a parseable BlogPosting JSON-LD block", async ({ page }) => {
  await page.goto("/");
  // No hardcoded slug: enter through the first real blog link on the home page.
  const href = await page.locator('a[href^="/blogs/"]').first().getAttribute("href");
  expect(href, "home page should link to at least one post").toBeTruthy();
  await page.goto(href!);

  const ld = page.locator('script[type="application/ld+json"]');
  await expect(ld).toHaveCount(1);

  // The escape (`<`) must be lossless: what the browser parses back is
  // the real structured data, and it is well-formed JSON.
  const json = JSON.parse((await ld.textContent()) ?? "{}");
  expect(json["@type"]).toBe("BlogPosting");
  expect(typeof json.headline).toBe("string");
  expect(json.headline.length).toBeGreaterThan(0);
  expect(json.author?.[0]?.["@type"]).toBe("Person");
});
