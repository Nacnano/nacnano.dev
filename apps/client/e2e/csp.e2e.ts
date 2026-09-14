import { test, expect, type Page } from "@playwright/test";

/**
 * The reason `script-src 'unsafe-inline'` could be removed, and the guard that
 * keeps it removed.
 *
 * A stale hash manifest or a Next release that stops stamping the nonce onto
 * its bootstrap scripts both fail the same way: the policy is emitted, the
 * browser refuses the inline scripts, and the page never hydrates. That is
 * invisible to a header assertion, so these tests watch what the browser
 * actually did.
 */
// `/ama` is the only page carrying a server action, so it is the one whose
// policy has the most to get wrong. What it does NOT guard is its JSON-LD
// block: measured by deleting that hash from the manifest and re-serving, a
// `type="application/ld+json"` data block is never prepared as a script, so
// the browser neither refuses it nor reports a violation. It is hashed as
// defence in depth; nothing observable depends on the hash being there.
const PAGES = ["/", "/about", "/projects", "/blogs/dating-app", "/activity", "/ama"];

type CspReporter = { __reportCspViolation: (directive: string, sample: string) => void };

/** CSP refusals surface as `securitypolicyviolation`, not as console errors. */
async function recordViolations(page: Page): Promise<string[]> {
  const violations: string[] = [];
  await page.exposeFunction(
    "__reportCspViolation",
    (directive: string, sample: string) => {
      violations.push(`${directive}: ${sample}`);
    }
  );
  await page.addInitScript(() => {
    document.addEventListener("securitypolicyviolation", (event) => {
      (window as unknown as CspReporter).__reportCspViolation(
        event.violatedDirective,
        event.sample ?? ""
      );
    });
  });
  return violations;
}

for (const path of PAGES) {
  test(`${path} runs every inline script under a nonce/hash CSP`, async ({ page }) => {
    const violations = await recordViolations(page);

    const response = await page.goto(path);
    const policy = response?.headers()["content-security-policy"] ?? "";
    const scriptSrc = policy
      .split(";")
      .find((part) => part.trim().startsWith("script-src "))!;

    expect(scriptSrc).toBeTruthy();
    expect(scriptSrc).not.toContain("'unsafe-inline'");
    expect(scriptSrc).toMatch(/'nonce-[A-Za-z0-9+/=]+'/);

    // Checked before the hydration assertions below, so a refused script is
    // named by its directive and sample rather than as a missing button.
    await page.waitForLoadState("load");
    expect(violations, `CSP violations on ${path}`).toEqual([]);

    // The next-themes bootstrap is an inline script; if it were refused, the
    // class it writes before paint would be missing.
    await expect(page.locator("html")).toHaveClass(/\b(light|dark)\b/);

    // And hydration only labels the toggle once React has taken over, which
    // cannot happen if the RSC payload scripts were refused.
    await expect(
      page.getByRole("button", { name: /Switch to (light|dark) theme/ })
    ).toBeVisible();

    expect(violations, `CSP violations on ${path}`).toEqual([]);
  });
}
