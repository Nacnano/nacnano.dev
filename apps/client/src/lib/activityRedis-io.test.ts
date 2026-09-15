import { describe, expect, it, beforeAll, afterAll, mock } from "bun:test";

/**
 * Unit-tests the @upstash/redis adapter (`readActivityFeed`, `recordVisit`,
 * `getActivityClient`) against a fake client — no network, deterministic. This
 * is the store-failure / pagination / write-shape coverage that can't be reached
 * through the mocked boundary in the route tests.
 */
import * as observabilityReal from "./observability";

const originalObservability = { ...observabilityReal };

type Captured = { error: unknown; context: Record<string, unknown> };
const capturedErrors: Captured[] = [];

mock.module("./observability", () => ({
  captureError: (error: unknown, context: Record<string, unknown> = {}) => {
    capturedErrors.push({ error, context });
  },
}));

type PipeCall = { cmd: string; args: unknown[] };
const pipeCalls: PipeCall[] = [];
let xrevrangeReturn: unknown = {};
let getReturn: number | null = null;

class FakeRedis {
  xrevrange(..._a: unknown[]) {
    return xrevrangeReturn;
  }
  get(..._a: unknown[]) {
    return getReturn;
  }
  pipeline() {
    const self: Record<string, unknown> = {};
    const record =
      (cmd: string) =>
      (...args: unknown[]) => {
        pipeCalls.push({ cmd, args });
        return self;
      };
    self.xadd = record("xadd");
    self.incr = record("incr");
    self.xtrim = record("xtrim");
    self.expire = record("expire");
    self.exec = async () => [];
    return self;
  }
}

mock.module("@upstash/redis", () => ({ Redis: FakeRedis }));

// getActivityClient gates on these; set them (with a valid salt, since a
// configured deployment is required to have one) so the fake client is built.
beforeAll(() => {
  process.env.UPSTASH_REDIS_REST_URL = "https://fake.upstash.example";
  process.env.UPSTASH_REDIS_REST_TOKEN = "fake-token";
  process.env.VISIT_IP_SALT = "test-salt-value-that-is-long-enough-32";
});
afterAll(() => {
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  delete process.env.VISIT_IP_SALT;
  // `mock.module` is process-global — put observability back for the next file.
  mock.module("./observability", () => originalObservability);
});

import { getActivityClient, readActivityFeed, recordVisit } from "./activityRedis";

describe("getActivityClient", () => {
  it("constructs once and caches", () => {
    const a = getActivityClient();
    expect(a).toBeInstanceOf(FakeRedis);
    expect(getActivityClient()).toBe(a);
  });
});

describe("readActivityFeed", () => {
  it("maps a full page to newest-first visits with a cursor + hasMore", async () => {
    xrevrangeReturn = {
      "1700000002000-0": {
        data: { id: "2", ts: "2026-09-14T02:00:00.000Z", page: "/b" },
      },
      "1700000001000-0": {
        data: { id: "1", ts: "2026-09-14T01:00:00.000Z", page: "/a" },
      },
    };
    getReturn = 42;
    const page = await readActivityFeed(2);
    expect(page.count).toBe(42);
    expect(page.visits.map((v) => v.id)).toEqual(["2", "1"]);
    expect(page.hasMore).toBe(true); // full page → older likely remain
    expect(page.nextCursor).toBe("1700000001000-0"); // oldest id in the page
  });

  it("stops paging on a short page and skips uncoercible entries", async () => {
    xrevrangeReturn = {
      "5-0": { data: { id: "1", ts: "2026-09-14T01:00:00.000Z", page: "/a" } },
      "4-0": { data: { notAVisit: true } },
    };
    getReturn = null; // falls back to page length
    const page = await readActivityFeed(30);
    expect(page.visits).toHaveLength(1);
    expect(page.count).toBe(1);
    expect(page.hasMore).toBe(false);
  });

  it("reports corrupt rows as ONE captured error per read, not per row", async () => {
    // The feed is polled every ~2.5s per open tab; a page of unparseable rows
    // must fan out a single report, not one POST per row, or a data problem
    // becomes an outbound-traffic problem.
    capturedErrors.length = 0;
    xrevrangeReturn = {
      "8-0": { data: { broken: 1 } },
      "7-0": { data: { broken: 2 } },
      "6-0": { data: { broken: 3 } },
    };
    getReturn = 3;
    const page = await readActivityFeed(30);
    expect(page.visits).toHaveLength(0);
    expect(capturedErrors).toHaveLength(1);
    expect(capturedErrors[0]?.context).toMatchObject({
      scope: "activity-feed",
      total: 3,
    });
  });

  it("drops a well-formed row whose page is not an internal path", async () => {
    // A valid VisitEvent shape with an absolute/protocol-relative page — exactly
    // what an attacker injected before the write guard existed. The read path
    // re-checks, so it can never surface as an outbound link in the feed.
    xrevrangeReturn = {
      "3-0": { data: { id: "1", ts: "2026-09-14T03:00:00.000Z", page: "/ok" } },
      "2-0": {
        data: { id: "2", ts: "2026-09-14T02:00:00.000Z", page: "//evil.example" },
      },
      "1-0": {
        data: { id: "3", ts: "2026-09-14T01:00:00.000Z", page: "https://evil.example/x" },
      },
    };
    getReturn = 99; // running total is independent of the filtered rows
    const page = await readActivityFeed(30);
    expect(page.visits.map((v) => v.id)).toEqual(["1"]);
    expect(page.count).toBe(99);
  });

  it("does not let a filtered row truncate the page or mis-key the cursor", async () => {
    // Regression: `hasMore`/`nextCursor` must be decided by the RAW page Redis
    // returned, not the filtered one. Five rows for limit=5 is a full page (so
    // older entries remain) even though one is dropped; paging must continue,
    // and the cursor must be the oldest RAW id — otherwise a single poisoned row
    // ends the walk early and strands all older history.
    xrevrangeReturn = {
      "5-0": { data: { id: "5", ts: "2026-09-14T05:00:00.000Z", page: "/e" } },
      "4-0": { data: { id: "4", ts: "2026-09-14T04:00:00.000Z", page: "/d" } },
      "3-0": {
        data: { id: "x", ts: "2026-09-14T03:00:00.000Z", page: "//evil.example" },
      },
      "2-0": { data: { id: "2", ts: "2026-09-14T02:00:00.000Z", page: "/b" } },
      "1-0": { data: { id: "1", ts: "2026-09-14T01:00:00.000Z", page: "/a" } },
    };
    getReturn = 500;
    const page = await readActivityFeed(5);
    expect(page.visits.map((v) => v.id)).toEqual(["5", "4", "2", "1"]);
    expect(page.hasMore).toBe(true); // full RAW page → keep paging
    expect(page.nextCursor).toBe("1-0"); // oldest RAW id, filtered row included
  });

  it("projects rows to the public shape: no coordinates, sub-threshold city dropped", async () => {
    // The privacy guarantee on the READ path (option B): even a fully-populated
    // stored row must serialise without lat/lng, and a lone city name below the
    // k-anonymity threshold must not survive. The globe still gets points, via
    // aggregated markers computed from the (private) coordinates.
    const shared = (n: number, id: string) =>
      Array.from({ length: n }, (_, i) => ({
        id: `${id}-${i}`,
        ts: `2026-09-14T0${i % 9}:00:00.000Z`,
        page: "/blogs/x",
        countryCode: "TH",
        city: id,
        lat: 13.7,
        lng: 100.5,
      }));
    // 2 "Lagos" (below k=5) + 5 "Bangkok" (at k) in one page.
    const rows = [...shared(2, "Lagos"), ...shared(5, "Bangkok")];
    const obj: Record<string, { data: unknown }> = {};
    rows.forEach((r, i) => {
      obj[`${1700000000000 + i}-0`] = { data: r };
    });
    xrevrangeReturn = obj;
    getReturn = 7;

    const page = await readActivityFeed(30);
    // No public row ever carries a coordinate or an under-threshold city.
    for (const visit of page.visits) {
      expect(visit).not.toHaveProperty("lat");
      expect(visit).not.toHaveProperty("lng");
      if (visit.id.startsWith("Lagos")) expect(visit.city).toBeUndefined();
    }
    // Bangkok clears the threshold, so its name survives on its rows.
    expect(page.visits.find((v) => v.id.startsWith("Bangkok"))?.city).toBe("Bangkok");
    // Coordinates returned to the globe only as aggregated markers.
    expect(page.markers?.length).toBeGreaterThan(0);
  });
});

describe("recordVisit", () => {
  it("writes one pipelined batch: append + count + age trim + idle expiry", async () => {
    pipeCalls.length = 0;
    const ok = await recordVisit({ path: "/x", title: "X", lat: 13.7563, lng: 100.5018 });
    expect(ok).toBe(true);
    const cmds = pipeCalls.map((c) => c.cmd);
    expect(cmds).toContain("xadd");
    expect(cmds).toContain("incr");
    expect(cmds).toContain("xtrim");
    expect(cmds.filter((c) => c === "expire")).toHaveLength(2);

    const xadd = pipeCalls.find((c) => c.cmd === "xadd")!;
    const payload = JSON.parse((xadd.args[2] as { data: string }).data);
    expect(payload.lat).toBe(13.8); // coarsened
    expect(payload.lng).toBe(100.5);
  });
});
