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

test("every answer has a distinctly-named permalink pointing at a real anchor", async ({
  page,
}) => {
  await page.goto("/ama");

  const permalinks = page.locator('h3 a[href^="#"]');
  const count = await permalinks.count();
  expect(count, "the page should publish at least one answer").toBeGreaterThan(0);

  const names = new Set<string>();
  for (let i = 0; i < count; i += 1) {
    const link = permalinks.nth(i);
    const name = await link.getAttribute("aria-label");
    // Six links called "Link to this question" are six indistinguishable rows
    // in a screen reader's link list.
    expect(name).toBeTruthy();
    names.add(name!);

    const href = (await link.getAttribute("href"))!;
    await expect(page.locator(href)).toHaveCount(1);
  }
  expect(names.size).toBe(count);
});

test("the ask box has a real label and states what happens to a question", async ({
  page,
}) => {
  await page.goto("/ama");

  // Found by its visible <label>, not by a placeholder standing in for one.
  const question = page.getByLabel("Your question");
  await expect(question).toBeVisible();
  await expect(page.getByRole("button", { name: "Send question" })).toBeVisible();
  await expect(page.getByText(/goes to a private inbox/i)).toBeVisible();
});

test("a submission with no store configured says so instead of faking success", async ({
  page,
}) => {
  await page.goto("/ama");

  await page.getByLabel("Your question").fill("Does the ask box tell the truth?");
  await page.getByRole("button", { name: "Send question" }).click();

  // The result lands in the live region — the same node a screen reader is
  // already watching — and never claims the question was sent.
  const live = page.locator('[aria-live="polite"]');
  await expect(live).toContainText(/isn't working right now/i);
  await expect(live).not.toContainText(/^Sent/);
});
