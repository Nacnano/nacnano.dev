/**
 * Test preload (wired from `bunfig.toml`'s `[test] preload`).
 *
 * The server modules (`activityRedis`, `amaInbox`, `amaNotify`, `discord`,
 * `runtimeConfig`) carry `import "server-only"`, whose real entry throws when
 * it is not resolved under a `react-server` bundler condition. Under `bun test`
 * there is no such condition, so importing those modules for a unit test would
 * fail at the import. This registers an empty stub before any test file loads
 * its imports, so the build-time-only guard is inert in the test runtime — it
 * does its real work in `next build`, which this file never runs.
 */
import { mock } from "bun:test";

mock.module("server-only", () => ({}));
