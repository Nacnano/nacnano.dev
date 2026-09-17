import { test, expect } from "@playwright/test";

/**
 * /ama is the only page with a form, so it is the only place where a browser
 * test earns its keep: hydration of the ask box, the live region that announces
 * a result, and the honest "no store configured" path — which is exactly the
 * state this suite runs in (static mode, no Upstash).
 */

test("renders a parseable FAQPage JSON-LD block", async ({ page }) => {
  await page.goto("/ama");

  const ld = page.locator('script[type="application/ld+json"]');
  await expect(ld).toHaveCount(1);

  // The `<` escape must be lossless: what the browser parses back is the real
  // structured data, and it is well-formed JSON.
  const json = JSON.parse((await ld.textContent()) ?? "{}");
  expect(json["@type"]).toBe("FAQPage");
  expect(Array.isArray(json.mainEntity)).toBe(true);
  for (const entry of json.mainEntity) {
    expect(entry["@type"]).toBe("Question");
    // Markdown must not leak into the snippet.
    expect(entry.acceptedAnswer.text).not.toContain("](");
  }
});

test("every answer has a unique anchor for feed deep links", async ({ page }) => {
  await page.goto("/ama");

  const headings = page.locator("article h3[id]");
  const count = await headings.count();
  expect(count, "the page should publish at least one answer").toBeGreaterThan(0);

  const ids = new Set<string>();
  for (let i = 0; i < count; i += 1) {
    const id = await headings.nth(i).getAttribute("id");
    expect(id).toBeTruthy();
    ids.add(id!);
  }
  expect(ids.size).toBe(count);
});

test("answers start as previews and can be expanded", async ({ page }) => {
  await page.goto("/ama");

  const firstAnswer = page.locator("article").first();
  const toggle = firstAnswer.getByRole("button", { name: "Read more" });

  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(firstAnswer.getByText(/…$/)).toBeVisible();

  await toggle.click();

  await expect(firstAnswer.getByRole("button", { name: "Show less" })).toHaveAttribute(
    "aria-expanded",
    "true"
  );
  await expect(firstAnswer.locator(".prose p")).toHaveCount(3);
});

test("the ask box expands from a text button and explains what happens", async ({
  page,
}) => {
  await page.goto("/ama");

  const disclosure = page.getByRole("button", { name: "Ask a question" });
  await expect(disclosure).toHaveAttribute("aria-expanded", "false");

  // Found by its visible <label>, not by a placeholder standing in for one.
  const question = page.getByLabel("Your question");
  await expect(question).toBeHidden();

  await disclosure.click();

  await expect(page.getByRole("button", { name: "Close form" })).toHaveAttribute(
    "aria-expanded",
    "true"
  );
  await expect(question).toBeVisible();
  await expect(page.getByRole("button", { name: "Send question" })).toBeVisible();
  await expect(page.getByText(/goes to a private inbox/i)).toBeVisible();
});

test("a submission with no store configured says so instead of faking success", async ({
  page,
}) => {
  await page.goto("/ama");
  await page.getByRole("button", { name: "Ask a question" }).click();

  await page.getByLabel("Your question").fill("Does the ask box tell the truth?");
  await page.getByRole("button", { name: "Send question" }).click();

  // The result lands in the live region — the same node a screen reader is
  // already watching — and never claims the question was sent.
  const live = page.locator('[aria-live="polite"]');
  await expect(live).toContainText(/isn't working right now/i);
  await expect(live).not.toContainText(/^Sent/);
});

test("serves /ama/rss.xml as a real feed the page points at", async ({
  page,
  request,
}) => {
  // The AMA feed is written into `public/` by the postbuild, so the thing worth
  // proving is that it survives to the wire: a static file under a path that is
  // also an app route is exactly where a build can quietly drop it.
  await page.goto("/ama");
  const href = await page
    .locator('link[rel="alternate"][type="application/rss+xml"][href*="/ama/rss.xml"]')
    .getAttribute("href");
  expect(href).toBeTruthy();

  const response = await request.get("/ama/rss.xml");
  expect(response.status()).toBe(200);

  const xml = await response.text();
  expect(xml).toContain("<rss");
  expect(xml).toContain("<atom:link");
  // One item per answer on the page, each anchored at its own heading.
  const guids = [...xml.matchAll(/<guid>([^<]+)<\/guid>/g)].map((m) => m[1]!);
  const anchors = await page
    .locator("article h3[id]")
    .evaluateAll((nodes) => nodes.map((n) => n.id));
  expect(guids).toHaveLength(anchors.length);
  for (const id of anchors) {
    expect(guids.some((g) => g.endsWith(`/ama#${id}`))).toBe(true);
  }
});
