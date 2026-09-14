import { describe, expect, it, beforeAll, afterAll, mock } from "bun:test";

/**
 * Unit-tests the @upstash/redis adapter (`readActivityFeed`, `recordVisit`,
 * `getActivityClient`) against a fake client — no network, deterministic. This
 * is the store-failure / pagination / write-shape coverage that can't be reached
 * through the mocked boundary in the route tests.
 */
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

// getActivityClient gates on these; set them so the fake client is constructed.
beforeAll(() => {
  process.env.UPSTASH_REDIS_REST_URL = "https://fake.upstash.example";
  process.env.UPSTASH_REDIS_REST_TOKEN = "fake-token";
});
afterAll(() => {
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
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
