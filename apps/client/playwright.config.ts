import { defineConfig, devices } from "@playwright/test";

/**
 * Browser-level e2e. Kept entirely separate from `bun test` (which covers pure
 * functions + route handlers): these are the only tests that exercise real
 * hydration — theme persistence, the mobile focus trap, the JSON-LD blob, the
 * activity feed's first paint.
 *
 * Spec files are named `*.e2e.ts` (not `*.test.ts`) so the bun test runner never
 * discovers them. Run with `bun run e2e`.
 *
 * They run against a production `next start` in **static mode** (no Upstash):
 * `/activity` therefore renders the honest local seed, and no real Redis is ever
 * reached. Cursor pagination / poll-merge are covered by unit tests instead,
 * since they need a live store.
 */
export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.e2e.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      testIgnore: "**/mobile-nav.e2e.ts",
    },
    {
      // The mobile menu is `sm:hidden`; only a small viewport reveals it.
      name: "mobile",
      use: { ...devices["Pixel 7"] },
      testMatch: "**/mobile-nav.e2e.ts",
    },
  ],
  webServer: {
    command: "bun run start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
