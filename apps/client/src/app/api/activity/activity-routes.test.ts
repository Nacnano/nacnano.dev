import { describe, it, expect, beforeAll, beforeEach, afterAll, mock } from "bun:test";

/**
 * HTTP-boundary tests for the activity route handlers and the SSR feed loader.
 * These are the pieces that run per-request, branching on store/geo/rate-limit
 * collaborators, so the collaborators are mocked and the handlers driven with
 * real Request objects. The mocked modules are spread with their originals so
 * any export NOT overridden (e.g. `parseStreamEntries`, `coarsenCoordinate`)
 * stays real even though `mock.module` is process-global.
 */
import * as activity from "@/lib/activity";
import * as activityRedis from "@/lib/activityRedis";
import * as rateLimit from "@/lib/rateLimit";
import * as observability from "@/lib/observability";
import { loadInitialFeed } from "@/lib/activityServer";
import { seedVisits } from "@/data/activityData";
import type { VisitInput } from "@/lib/activityRedis";
import type { VisitFeedPayload } from "@/lib/activityTypes";
import { GET as getFeed } from "./feed/route";
import { POST as postVisit } from "./visit/route";

const originalActivity = { ...activity };
const originalRedis = { ...activityRedis };
const originalRateLimit = { ...rateLimit };
const originalObservability = { ...observability };

type Control = {
  live: boolean;
  seed: boolean;
  client: boolean;
  allow: boolean;
  read: (limit: number, before?: string | null) => Promise<VisitFeedPayload>;
  record: (input: VisitInput) => Promise<boolean>;
};

let ctrl: Control;
let recordCalls: VisitInput[];
let readCalls: Array<[number, string | null | undefined]>;
let errors: unknown[];

function reset() {
  ctrl = {
    live: false,
    seed: true,
    client: true,
    allow: true,
    read: async () => ({ visits: [], count: 0, hasMore: false, nextCursor: null }),
    record: async () => true,
  };
  recordCalls = [];
  readCalls = [];
  errors = [];
}

mock.module("@/lib/activity", () => ({
  ...originalActivity,
  isActivityLive: () => ctrl.live,
  shouldUseSeed: () => ctrl.seed,
}));
mock.module("@/lib/activityRedis", () => ({
  ...originalRedis,
  getActivityClient: () => (ctrl.client ? {} : null),
  readActivityFeed: (limit: number, before?: string | null) => {
    readCalls.push([limit, before]);
    return ctrl.read(limit, before);
  },
  recordVisit: (input: VisitInput) => {
    recordCalls.push(input);
    return ctrl.record(input);
  },
}));
mock.module("@/lib/rateLimit", () => ({
  ...originalRateLimit,
  allowVisit: async () => ctrl.allow,
  clientIp: () => "203.0.113.7",
}));
mock.module("@/lib/observability", () => ({
  captureError: (error: unknown) => errors.push(error),
}));

function feedRequest(query = "") {
  return new Request(`https://nacnano.dev/api/activity/feed${query}`);
}

function visitRequest(body: BodyInit, headers: Record<string, string> = {}) {
  return new Request("https://nacnano.dev/api/activity/visit", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body,
  });
}

beforeAll(reset);
beforeEach(reset);
// `mock.module` is process-global, so put every collaborator back for whatever
// test file runs next (bun does NOT auto-restore module mocks).
afterAll(() => {
  mock.module("@/lib/activity", () => originalActivity);
  mock.module("@/lib/activityRedis", () => originalRedis);
  mock.module("@/lib/rateLimit", () => originalRateLimit);
  mock.module("@/lib/observability", () => originalObservability);
  mock.restore();
});

describe("GET /api/activity/feed", () => {
  it("serves the sample seed in store-less dev, unpaginated", async () => {
    const body = await (await getFeed(feedRequest())).json();
    expect(body.visits).toHaveLength(seedVisits.length);
    expect(body.count).toBe(seedVisits.length);
    expect(body.hasMore).toBe(false);
  });

  it("serves an honest empty feed on a deploy with no store", async () => {
    ctrl.seed = false;
    const body = await (await getFeed(feedRequest())).json();
    expect(body).toEqual({ visits: [], count: 0, hasMore: false, nextCursor: null });
  });

  it("returns exactly what the store holds when live", async () => {
    ctrl.live = true;
    ctrl.read = async () => ({
      visits: [{ id: "1", ts: "2026-09-14T00:00:00.000Z", page: "/" }],
      count: 42,
      hasMore: true,
      nextCursor: "1700000000000-0",
    });
    const body = await (await getFeed(feedRequest())).json();
    expect(body.count).toBe(42);
    expect(body.nextCursor).toBe("1700000000000-0");
  });

  it("reports an upstream failure as 503, not an empty feed", async () => {
    ctrl.live = true;
    ctrl.read = async () => {
      throw new Error("redis down");
    };
    const res = await getFeed(feedRequest());
    expect(res.status).toBe(503);
    expect(errors).toHaveLength(1);
  });

  it("clamps the limit to the 1..100 window", async () => {
    ctrl.live = true;
    await getFeed(feedRequest("?limit=999"));
    await getFeed(feedRequest("?limit=0"));
    await getFeed(feedRequest("?limit=50"));
    await getFeed(feedRequest("?limit=abc"));
    expect(readCalls.map(([limit]) => limit)).toEqual([100, 1, 50, 30]);
  });

  it("passes the cursor through for older pages", async () => {
    ctrl.live = true;
    await getFeed(feedRequest("?before=1700000000000-0"));
    expect(readCalls[0]?.[1]).toBe("1700000000000-0");
  });
});

describe("POST /api/activity/visit", () => {
  const geo = {
    "x-vercel-ip-country": "TH",
    "x-vercel-ip-city": "Bangkok",
    "x-vercel-ip-latitude": "13.75",
    "x-vercel-ip-longitude": "100.50",
  };

  it("records the visit with geo when live", async () => {
    ctrl.live = true;
    const res = await postVisit(
      visitRequest(JSON.stringify({ path: "/blogs/hello", title: "Hello" }), geo)
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, skipped: false });
    expect(recordCalls[0]).toMatchObject({
      path: "/blogs/hello",
      title: "Hello",
      countryCode: "TH",
      city: "Bangkok",
      lat: 13.75,
      lng: 100.5,
    });
  });

  it("clamps an over-long title to the bounded maximum", async () => {
    ctrl.live = true;
    await postVisit(visitRequest(JSON.stringify({ path: "/x", title: "a".repeat(500) })));
    expect(recordCalls[0]?.title).toHaveLength(200);
  });

  it("throttles a flooding client with 429 and never writes", async () => {
    ctrl.live = true;
    ctrl.allow = false;
    const res = await postVisit(visitRequest(JSON.stringify({ path: "/x" })));
    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBe("60");
    expect(recordCalls).toHaveLength(0);
  });

  it("rejects a malformed body", async () => {
    ctrl.live = true;
    const res = await postVisit(visitRequest("not json"));
    expect(res.status).toBe(400);
  });

  it("rejects a missing or empty path", async () => {
    ctrl.live = true;
    const res = await postVisit(visitRequest(JSON.stringify({ title: "x" })));
    expect(res.status).toBe(400);
  });

  it("rejects an over-long path rather than truncating it", async () => {
    ctrl.live = true;
    const res = await postVisit(visitRequest(JSON.stringify({ path: "/x".repeat(200) })));
    expect(res.status).toBe(400);
    expect(recordCalls).toHaveLength(0);
  });

  it("acknowledges a write failure without surfacing it, and reports it", async () => {
    ctrl.live = true;
    ctrl.record = async () => {
      throw new Error("stream write failed");
    };
    const res = await postVisit(visitRequest(JSON.stringify({ path: "/x" })));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, skipped: true });
    expect(errors).toHaveLength(1);
  });

  it("short-circuits in static mode before parsing or limiting", async () => {
    ctrl.live = false;
    const res = await postVisit(visitRequest("not json"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, skipped: true });
    expect(recordCalls).toHaveLength(0);
  });
});

describe("loadInitialFeed (SSR first paint)", () => {
  it("returns the store page when live", async () => {
    ctrl.live = true;
    ctrl.read = async () => ({
      visits: [{ id: "1", ts: "2026-09-14T00:00:00.000Z", page: "/" }],
      count: 7,
      hasMore: true,
      nextCursor: "1-0",
    });
    const result = await loadInitialFeed(true);
    expect(result.status).toBe("ok");
    if (result.status === "ok") expect(result.payload.count).toBe(7);
  });

  it("reports an error and surfaces it — never a fabricated empty feed", async () => {
    ctrl.read = async () => {
      throw new Error("redis down");
    };
    const result = await loadInitialFeed(true);
    expect(result).toEqual({ status: "error" });
    expect(errors).toHaveLength(1);
  });

  it("serves the seed locally, empty on a store-less deploy", async () => {
    const seeded = await loadInitialFeed(false);
    expect(seeded.status).toBe("ok");
    if (seeded.status === "ok") {
      expect(seeded.payload.visits).toHaveLength(seedVisits.length);
    }

    reset();
    ctrl.seed = false;
    const empty = await loadInitialFeed(false);
    expect(empty.status).toBe("ok");
    if (empty.status === "ok") expect(empty.payload.visits).toHaveLength(0);
  });
});
