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
import * as visitTitles from "@/lib/visitTitles";
import { loadInitialFeed } from "@/lib/activityServer";
import { seedVisits } from "@/data/activityData";
import type { VisitInput } from "@/lib/activityRedis";
import type { VisitFeedPayload } from "@/lib/activityTypes";
import { RedisConfigError } from "@/lib/runtimeConfig";
import { GET as getFeed } from "./feed/route";
import { POST as postVisit } from "./visit/route";

const originalActivity = { ...activity };
const originalRedis = { ...activityRedis };
const originalRateLimit = { ...rateLimit };
const originalObservability = { ...observability };
const originalVisitTitles = { ...visitTitles };

type Control = {
  live: boolean;
  seed: boolean;
  client: boolean;
  allow: boolean;
  read: (limit: number, before?: string | null) => Promise<VisitFeedPayload>;
  record: (input: VisitInput) => Promise<boolean>;
  title: (path: string) => string | undefined;
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
    title: () => undefined,
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
  getActivityClientOrNull: () => (ctrl.client ? {} : null),
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
  allowFeed: async () => ctrl.allow,
  clientIp: () => "203.0.113.7",
}));
mock.module("@/lib/observability", () => ({
  captureError: (error: unknown) => errors.push(error),
}));
// Titles are resolved server-side from our own content; stub the lookup so the
// route's title wiring is testable without reading the real MDX corpus.
mock.module("@/lib/visitTitles", () => ({
  resolveVisitTitle: (path: string) => ctrl.title(path),
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
  mock.module("@/lib/visitTitles", () => originalVisitTitles);
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
    const res = await getFeed(feedRequest());
    const body = await res.json();
    expect(body.count).toBe(42);
    expect(body.nextCursor).toBe("1700000000000-0");
    // The per-tab poll storm is absorbed at the edge; the client tolerates this
    // much staleness by design (it polls on a 2.5s cadence anyway).
    expect(res.headers.get("cache-control")).toContain("s-maxage=2");
  });

  it("re-derives a stored visit's title from our content at read time", async () => {
    // The store holds an /ama row beaconed before /ama had a registered title,
    // so it was stored with none. The feed must show the resolved label, not the
    // raw path — which is the whole point of resolving on read, not on write.
    ctrl.live = true;
    ctrl.title = (path) => (path === "/ama" ? "Ask me anything" : undefined);
    ctrl.read = async () => ({
      visits: [{ id: "1", ts: "2026-09-14T00:00:00.000Z", page: "/ama" }],
      count: 1,
      hasMore: false,
      nextCursor: null,
    });
    const body = await (await getFeed(feedRequest())).json();
    expect(body.visits[0]).toMatchObject({ page: "/ama", title: "Ask me anything" });
  });

  it("keeps a stored title the resolver has no opinion about", async () => {
    ctrl.live = true;
    ctrl.title = () => undefined;
    ctrl.read = async () => ({
      visits: [
        {
          id: "1",
          ts: "2026-09-14T00:00:00.000Z",
          page: "/somewhere",
          title: "Authored",
        },
      ],
      count: 1,
      hasMore: false,
      nextCursor: null,
    });
    const body = await (await getFeed(feedRequest())).json();
    expect(body.visits[0].title).toBe("Authored");
  });

  it("throttles an unauthenticated flood of reads with 429", async () => {
    ctrl.live = true;
    ctrl.allow = false;
    const res = await getFeed(feedRequest("?limit=100"));
    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBe("60");
    expect(readCalls).toHaveLength(0);
  });

  it("reports an upstream failure as 503, not an empty feed", async () => {
    ctrl.live = true;
    ctrl.read = async () => {
      throw new Error("redis down");
    };
    const res = await getFeed(feedRequest());
    expect(res.status).toBe(503);
    // An outage must never be cached, or a 2s blip would serve empty for a while.
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(errors).toHaveLength(1);
  });

  it("answers 503, not 500, when the store is misconfigured", async () => {
    // A partial/weak live config throws out of the runtime configuration. The
    // route's job is to turn that into the same uncached 503 an outage gets, so
    // the client keeps its last good page. The 429 gate now lives under this
    // same handler, so a config error resolving the limiter lands here too.
    ctrl.live = true;
    ctrl.read = async () => {
      throw new RedisConfigError("VISIT_IP_SALT", "too short");
    };
    const res = await getFeed(feedRequest());
    expect(res.status).toBe(503);
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("clamps the limit to the 1..100 window", async () => {
    ctrl.live = true;
    await getFeed(feedRequest("?limit=999"));
    await getFeed(feedRequest("?limit=0"));
    await getFeed(feedRequest("?limit=50"));
    await getFeed(feedRequest("?limit=abc"));
    expect(readCalls.map(([limit]) => limit)).toEqual([100, 1, 50, 30]);
  });

  it("defaults to the full page size when the limit is omitted or unusable", async () => {
    // Regression: `Number(null) === 0` collapsed the default 30-row page to 1.
    ctrl.live = true;
    await getFeed(feedRequest()); // no query string at all
    await getFeed(feedRequest("?limit=")); // explicitly blank
    await getFeed(feedRequest("?limit=abc")); // non-numeric
    await getFeed(feedRequest("?limit=10.9")); // decimal, truncated down
    await getFeed(feedRequest("?limit=-5")); // negative, clamped to the floor
    expect(readCalls.map(([limit]) => limit)).toEqual([30, 30, 30, 10, 1]);
  });

  it("passes the cursor through for older pages", async () => {
    ctrl.live = true;
    await getFeed(feedRequest("?before=1700000000000-0"));
    expect(readCalls[0]?.[1]).toBe("1700000000000-0");
  });

  it("reads the head page with a null cursor when `before` is absent", async () => {
    ctrl.live = true;
    await getFeed(feedRequest());
    expect(readCalls[0]?.[1]).toBeNull();
  });

  it("reads the whole retained window when `all=1`, ignoring the cursor", async () => {
    // The globe and leaderboards ask for every stored row (up to STREAM_MAXLEN)
    // in one request, so the paging cursor must be bypassed entirely.
    ctrl.live = true;
    await getFeed(feedRequest("?all=1&before=1700000000000-0&limit=30"));
    expect(readCalls[0]?.[0]).toBe(1500);
    expect(readCalls[0]?.[1]).toBeNull();
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
    ctrl.title = (path) => (path === "/blogs/hello" ? "Hello" : undefined);
    const res = await postVisit(
      visitRequest(JSON.stringify({ path: "/blogs/hello", title: "IGNORED" }), geo)
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, skipped: false });
    expect(recordCalls[0]).toMatchObject({
      path: "/blogs/hello",
      countryCode: "TH",
      city: "Bangkok",
      lat: 13.75,
      lng: 100.5,
    });
    // The title is the server-resolved one, never the attacker-supplied string.
    expect(recordCalls[0]?.title).toBe("Hello");
  });

  it("ignores a client-supplied title in favour of the server's own", async () => {
    ctrl.live = true;
    ctrl.title = () => undefined;
    await postVisit(
      visitRequest(
        JSON.stringify({ path: "/about", title: "Free money https://evil.example" })
      )
    );
    // Unknown to the title resolver -> stored with no title (feed shows the path).
    expect(recordCalls[0]?.title).toBeUndefined();
  });

  it("records no coordinates when the geo headers are absent or blank", async () => {
    ctrl.live = true;
    await postVisit(
      visitRequest(JSON.stringify({ path: "/about" }), {
        // Present-but-empty must not read as latitude/longitude 0 (Null Island).
        "x-vercel-ip-latitude": "",
        "x-vercel-ip-longitude": "",
      })
    );
    expect(recordCalls[0]?.lat).toBeUndefined();
    expect(recordCalls[0]?.lng).toBeUndefined();
  });

  it("rejects an absolute or protocol-relative path so it can never be a link", async () => {
    ctrl.live = true;
    for (const path of [
      "https://evil.example/x",
      "//evil.example",
      "javascript:alert(1)",
    ]) {
      const res = await postVisit(visitRequest(JSON.stringify({ path })));
      expect(res.status).toBe(400);
    }
    expect(recordCalls).toHaveLength(0);
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
    const res = await postVisit(visitRequest(JSON.stringify({ path: "/about" })));
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

  it("acknowledges and drops a beacon when the store is misconfigured", async () => {
    // A broken *live* configuration (a throw out of the runtime config) must take
    // the same fire-and-forget branch as static mode, not 500 the visitor's
    // beacon. `ctrl.client = false` models `getActivityClientOrNull` reporting
    // the error and returning null.
    ctrl.live = true;
    ctrl.client = false;
    const res = await postVisit(visitRequest(JSON.stringify({ path: "/about" })));
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

  it("fills titles on the first paint, not only on poll", async () => {
    ctrl.live = true;
    ctrl.title = (path) => (path === "/ama" ? "Ask me anything" : undefined);
    ctrl.read = async () => ({
      visits: [{ id: "1", ts: "2026-09-14T00:00:00.000Z", page: "/ama" }],
      count: 1,
      hasMore: false,
      nextCursor: null,
    });
    const result = await loadInitialFeed(true);
    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.payload.visits[0]?.title).toBe("Ask me anything");
    }
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
