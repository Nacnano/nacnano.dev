import { describe, expect, it, mock, afterAll } from "bun:test";
import * as activityRedisReal from "./activityRedis";

const originalRedis = { ...activityRedisReal };

// State the premise explicitly rather than inheriting it from an unset
// `UPSTASH_*`: on a machine with a live `.env.local` (which bun auto-loads) the
// unmocked path would make a real outbound call and flake the suite.
mock.module("@/lib/activityRedis", () => ({
  getActivityClient: () => null,
  getActivityClientOrNull: () => null,
}));

import { allowVisit, clientIp } from "./rateLimit";

// `mock.module` is process-global; put `activityRedis` back for the next file.
afterAll(() => {
  mock.module("@/lib/activityRedis", () => originalRedis);
});

describe("clientIp", () => {
  it("takes the first entry of x-forwarded-for, trimmed", () => {
    const headers = new Headers({ "x-forwarded-for": " 203.0.113.9, 10.0.0.1" });
    expect(clientIp(headers)).toBe("203.0.113.9");
  });

  it("falls back to x-real-ip, then to a shared local bucket", () => {
    expect(clientIp(new Headers({ "x-real-ip": "198.51.100.4" }))).toBe("198.51.100.4");
    expect(clientIp(new Headers())).toBe("local");
  });
});

describe("allowVisit", () => {
  it("allows everything in static mode (no store configured)", async () => {
    // With no client there is nothing to protect, so the beacon is never limited.
    expect(await allowVisit("203.0.113.9")).toBe(true);
  });
});
