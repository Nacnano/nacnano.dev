import { describe, it, expect, afterAll, beforeEach, mock } from "bun:test";
import * as observabilityReal from "./observability";
import * as upstashRedisReal from "@upstash/redis";

/**
 * Covers the swallow in `getActivityClientOrNull` directly — its whole value is
 * that a broken live configuration becomes a reported `null`, not a throw. The
 * route/action tests can only see the downstream degraded response; this pins
 * the resolver itself, which is the thing a future refactor is most likely to
 * break by reaching for the throwing `getActivityClient` again.
 */

// A fake Redis so the *valid* case constructs something without a real client;
// the error/static cases never reach construction.
class FakeRedis {}
mock.module("@upstash/redis", () => ({ Redis: FakeRedis }));

const errors: unknown[] = [];
mock.module("./observability", () => ({
  captureError: (error: unknown) => errors.push(error),
}));

import { getActivityClientOrNull, __resetCachedClientForTests } from "./activityRedis";
import { resetRuntimeConfigCache } from "./runtimeConfig";

const SALT = "a-salt-with-at-least-32-characters-of-entropy";

function setEnv(env: Record<string, string | undefined>) {
  for (const key of [
    "UPSTASH_REDIS_REST_URL",
    "UPSTASH_REDIS_REST_TOKEN",
    "VISIT_IP_SALT",
  ] as const) {
    const value = env[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  resetRuntimeConfigCache();
  __resetCachedClientForTests();
}

beforeEach(() => {
  errors.length = 0;
});

afterAll(() => {
  setEnv({});
  mock.module("@upstash/redis", () => upstashRedisReal);
  mock.module("./observability", () => observabilityReal);
});

describe("getActivityClientOrNull", () => {
  it("reports and returns null on a weak salt (partial live config)", () => {
    setEnv({
      UPSTASH_REDIS_REST_URL: "https://fake.upstash.example",
      UPSTASH_REDIS_REST_TOKEN: "fake-token",
      VISIT_IP_SALT: "short",
    });
    expect(getActivityClientOrNull("test/weak-salt")).toBeNull();
    expect(errors).toHaveLength(1);
  });

  it("returns null with no report in static mode (neither credential)", () => {
    setEnv({});
    expect(getActivityClientOrNull("test/static")).toBeNull();
    // Static mode is the supported no-store path, not an error — nothing to
    // report, which is exactly why the callers can keep their degraded branch.
    expect(errors).toHaveLength(0);
  });

  it("returns a client on a valid live config", () => {
    setEnv({
      // https so the live path validates identically in and outside a test
      // environment; these cases are about the salt / credential rules the
      // resolver owns, not the transport check.
      UPSTASH_REDIS_REST_URL: "https://fake.upstash.example",
      UPSTASH_REDIS_REST_TOKEN: "fake-token",
      VISIT_IP_SALT: SALT,
    });
    const client = getActivityClientOrNull("test/valid");
    expect(client).toBeInstanceOf(FakeRedis);
    expect(errors).toHaveLength(0);
  });
});
