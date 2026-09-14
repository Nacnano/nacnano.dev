import { describe, expect, it, mock, afterAll } from "bun:test";
import * as activityRedisReal from "./activityRedis";
import * as observabilityReal from "./observability";
import * as upstashRatelimitReal from "@upstash/ratelimit";

const originalRedis = { ...activityRedisReal };
const originalObservability = { ...observabilityReal };
const originalRatelimit = { ...upstashRatelimitReal };

/**
 * Exercises the limiter against a configured store — kept in its own file so
 * `getLimiter`'s module-level cache starts clean (a static-mode run in another
 * file would otherwise pin it to "no client"). The Upstash client is faked, so
 * nothing touches the network.
 */
let behavior: (key: string) => Promise<{ success: boolean }> = async () => ({
  success: true,
});
let seenKey = "";

mock.module("@upstash/ratelimit", () => ({
  Ratelimit: class {
    static slidingWindow() {
      return () => ({});
    }
    limit(key: string) {
      seenKey = key;
      return behavior(key);
    }
  },
}));
mock.module("@/lib/activityRedis", () => ({
  // A truthy client so `getLimiter` builds the (faked) limiter above.
  getActivityClient: () => ({}),
}));
const errors: unknown[] = [];
mock.module("@/lib/observability", () => ({
  captureError: (error: unknown) => errors.push(error),
}));

import { allowVisit } from "./rateLimit";

describe("allowVisit against a live store", () => {
  it("keys the limiter by a salted digest, never the raw IP", async () => {
    seenKey = "";
    behavior = async () => ({ success: true });
    await allowVisit("203.0.113.9");
    expect(seenKey).toMatch(/^[0-9a-f]{64}$/);
    expect(seenKey).not.toContain("203.0.113.9");
  });

  it("throttles when the limiter says no", async () => {
    behavior = async () => ({ success: false });
    expect(await allowVisit("203.0.113.9")).toBe(false);
  });

  it("fails OPEN when the limiter store is down, and reports it", async () => {
    behavior = async () => {
      throw new Error("upstash unreachable");
    };
    // The outage must not become a 500 on the beacon path.
    expect(await allowVisit("203.0.113.9")).toBe(true);
    expect(errors.length).toBeGreaterThan(0);
  });
});

// `mock.module` is process-global — restore the faked collaborators so later
// files (e.g. the real observability test) see the genuine modules.
afterAll(() => {
  mock.module("@upstash/ratelimit", () => originalRatelimit);
  mock.module("@/lib/activityRedis", () => originalRedis);
  mock.module("@/lib/observability", () => originalObservability);
});
