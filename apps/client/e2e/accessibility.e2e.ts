import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * Automated accessibility coverage over representative production surfaces, in
 * both themes. This is the "crosses the browser boundary" arm of the PR 5
 * verification suite: the axe-core ruleset catches what a screen-reader user
 * cannot see — missing labels, unreachable focus, contrast, broken landmarks —
 * across real hydration, not just the static HTML the unit tests assert on.
 *
 * Keyboard interaction is NOT duplicated here; the focus-trap and AMA live-region
 * flows are already exercised in `mobile-nav.e2e.ts` and `ama.e2e.ts`, which read
 * better as behaviour tests than as rule scans.
 *
 * Only `serious` and `critical` impacts fail the build (plan 5.2): they are
 * blocking defects for someone who relies on assistive tech. `moderate` and
 * `minor` are reported in the failure text for triage but do not go red, so the
 * gate stays honest instead of being muted wholesale to silence the noise.
 */

type Theme = "light" | "dark";

type Violation = Awaited<ReturnType<AxeBuilder["analyze"]>>["violations"][number];

// Published routes only (all essays are `draft: false`), and the deliberate 404
// so the not-found boundary is scanned too — a page that exists for the worst
// moment of a user's visit still has to be navigable.
const SURFACES: ReadonlyArray<{ path: string; label: string }> = [
  { path: "/", label: "home" },
  { path: "/blogs/dating-app", label: "article" },
  { path: "/projects", label: "projects" },
  { path: "/ama", label: "ama" },
  { path: "/activity", label: "activity" },
  { path: "/privacy", label: "privacy" },
  { path: "/this-route-does-not-exist", label: "not-found" },
];

function describe(violations: Violation[]) {
  return violations.map((v) => ({
    id: v.id,
    impact: v.impact,
    help: v.help,
    nodes: v.nodes.map((n) => n.target.join(" ")),
  }));
}

async function scan(page: Page, path: string, theme: Theme) {
  // next-themes (attribute="class", default storageKey "theme") applies the
  // stored value before first paint; driving it directly is deterministic where
  // the OS/system default in CI would not be.
  await page.addInitScript((value) => {
    window.localStorage.setItem("theme", value);
  }, theme);

  await page.goto(path, { waitUntil: "networkidle" });
  await expect(page.locator("html")).toHaveClass(new RegExp(`\\b${theme}\\b`));

  // Freeze motion and the caret so contrast and visibility rules evaluate a
  // stable paint rather than an in-flight transition or the globe's animation.
  await page.addStyleTag({
    content:
      "*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important;caret-color:transparent!important}",
  });

  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"])
    .analyze();

  // Colour-contrast is theme-dependent, so it is the main reason each surface runs
  // twice; everything else is checked identically in both themes.
  const blocking = results.violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical"
  );

  expect(
    describe(blocking),
    `${path} (${theme}) has serious/critical accessibility violations`
  ).toEqual([]);
}

for (const surface of SURFACES) {
  for (const theme of ["light", "dark"] satisfies Theme[]) {
    test(`${surface.label} passes axe with no serious/critical violations in ${theme}`, async ({
      page,
    }) => {
      await scan(page, surface.path, theme);
    });
  }
}
