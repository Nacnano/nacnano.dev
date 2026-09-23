import { describe, it, expect, afterEach, afterAll, mock } from "bun:test";

/**
 * The report's windowing, aggregation, and embed shaping are pure and get
 * fixtures. Delivery orchestration (`sendDailyActivityReport`) runs against a
 * fake Upstash client — the house pattern from `activityRedis-io.test.ts` —
 * with the Discord send spied at the module boundary: what the embed *says*
 * is asserted here, what it looks like on the wire is `discord.test.ts`'s
 * job, and the transport's never-throws contract is asserted by the `false`
 * branch below.
 */
import * as observabilityReal from "./observability";
import * as discordReal from "./discord";
import type { DiscordMessage } from "./discord";
import type { VisitEvent } from "./activityTypes";
import type { PageAggregate } from "./activity";

const originalObservability = { ...observabilityReal };
const originalDiscord = { ...discordReal };

const sendCalls: DiscordMessage[] = [];
let sendReturn = true;

mock.module("./observability", () => ({
  captureError: () => {},
}));
mock.module("./discord", () => ({
  ...originalDiscord,
  sendDiscordMessage: async (message: DiscordMessage) => {
    sendCalls.push(message);
    return sendReturn;
  },
}));

import * as upstashReal from "@upstash/redis";

const originalUpstash = { ...upstashReal };

class FakeRedis {
  xrevrange(..._a: unknown[]) {
    return xrevrangeReturn;
  }
  get(..._a: unknown[]) {
    return getReturn;
  }
}
let xrevrangeReturn: unknown = {};
let getReturn: number | null = null;

mock.module("@upstash/redis", () => ({ Redis: FakeRedis }));

const ENV_KEYS = [
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  "VISIT_IP_SALT",
  "DISCORD_BOT_TOKEN",
  "DISCORD_CHANNEL_ID",
] as const;
const originalEnv: Partial<Record<(typeof ENV_KEYS)[number], string>> = {};
for (const key of ENV_KEYS) originalEnv[key] = process.env[key];

function setLiveEnv(): void {
  process.env.UPSTASH_REDIS_REST_URL = "https://fake.upstash.example";
  process.env.UPSTASH_REDIS_REST_TOKEN = "fake-token";
  process.env.VISIT_IP_SALT = "test-salt-value-that-is-long-enough-32";
}
function setDiscordEnv(): void {
  process.env.DISCORD_BOT_TOKEN = "fake-bot-token";
  process.env.DISCORD_CHANNEL_ID = "channel-1";
}
function clearLiveEnv(): void {
  for (const key of ENV_KEYS) {
    const original = originalEnv[key];
    if (original === undefined) delete process.env[key];
    else process.env[key] = original;
  }
}

afterEach(() => {
  sendCalls.length = 0;
  sendReturn = true;
  xrevrangeReturn = {};
  getReturn = null;
  clearLiveEnv();
});
afterAll(() => {
  // `mock.module` is process-global — put every swapped module back for the
  // files that run after this one, and drop the memoised fake client so a
  // later file that flips the Upstash env re-derives a real one.
  mock.module("./observability", () => originalObservability);
  mock.module("./discord", () => originalDiscord);
  mock.module("@upstash/redis", () => originalUpstash);
  mock.restore();
  __resetCachedClientForTests();
});

import {
  buildDailySummary,
  dailyReportMessage,
  REPORT_WINDOW_MS,
  sendDailyActivityReport,
  visitsInWindow,
} from "./activityReport";
import { __resetCachedClientForTests } from "./activityRedis";
import siteMetadata from "@/data/siteMetadata";

const NOW = new Date("2026-09-23T21:00:00.000Z");
const WINDOW_START = "2026-09-22T21:00:00.000Z";

function visit(
  id: string,
  ts: string,
  page: string,
  extra: Partial<VisitEvent> = {}
): VisitEvent {
  return { id, ts, page, ...extra };
}

/** Newest-first, as the store returns it: four inside the window (one exactly
 * on `from`), one exactly at `to`, one older than the window. */
const fixtureVisits = [
  visit("v5", "2026-09-23T21:00:00.000Z", "/"),
  visit("v1", "2026-09-23T20:00:00.000Z", "/blogs/hello", {
    title: "Hello",
    countryCode: "TH",
  }),
  visit("v2", "2026-09-23T12:00:00.000Z", "/blogs/hello"),
  visit("v3", "2026-09-23T05:00:00.000Z", "/", { countryCode: "US" }),
  visit("v4", WINDOW_START, "/about"),
  visit("v6", "2026-09-22T20:59:59.000Z", "/"),
];

describe("visitsInWindow", () => {
  it("keeps the window bounds left-closed and right-open", () => {
    const ids = visitsInWindow(fixtureVisits, NOW).map((v) => v.id);
    expect(ids).toEqual(["v1", "v2", "v3", "v4"]); // v5 == `to`, v6 older
  });

  it("honours a custom window length", () => {
    // 9h back from 21:00 lands exactly on v2 (12:00) — the left-closed bound.
    const nineHours = visitsInWindow(fixtureVisits, NOW, 9 * 60 * 60 * 1000);
    expect(nineHours.map((v) => v.id)).toEqual(["v1", "v2"]);
  });

  it("drops rows with an unparseable timestamp", () => {
    const junk = visit("bad", "not-a-date", "/");
    expect(visitsInWindow([junk], NOW)).toEqual([]);
  });
});

describe("buildDailySummary", () => {
  it("counts visits, countries, and top pages within the window", () => {
    const summary = buildDailySummary(fixtureVisits, 123, NOW);
    expect(summary).toMatchObject({
      from: new Date(NOW.getTime() - REPORT_WINDOW_MS).toISOString(),
      to: NOW.toISOString(),
      visits: 4,
      countries: 2,
      total: 123,
    });
    // Most-viewed first, ties in first-seen (newest-first) order, title kept.
    expect(summary.top).toEqual([
      { page: "/blogs/hello", title: "Hello", count: 2 },
      { page: "/", title: undefined, count: 1 },
      { page: "/about", title: undefined, count: 1 },
    ] satisfies PageAggregate[]);
  });

  it("caps the top-pages board", () => {
    const many = Array.from({ length: 7 }, (_, i) =>
      visit(`p${i}`, "2026-09-23T10:00:00.000Z", `/p${i}`)
    );
    expect(buildDailySummary(many, 7, NOW).top).toHaveLength(5);
  });

  it("is honest about a day with no visits", () => {
    const summary = buildDailySummary([], 999, NOW);
    expect(summary).toMatchObject({ visits: 0, countries: 0, total: 999 });
    expect(summary.top).toEqual([]);
  });
});

describe("dailyReportMessage", () => {
  it("shapes the embed: title, link, accent, timestamp, and totals footer", () => {
    const message = dailyReportMessage(buildDailySummary(fixtureVisits, 123, NOW));
    const embed = message.embeds?.[0];
    expect(embed).toMatchObject({
      title: "Daily activity — 2026-09-23",
      url: `${siteMetadata.siteUrl}/activity`,
      color: 0x2556da,
      timestamp: NOW.toISOString(),
    });
    expect(embed?.description).toContain("4 visits from 2 countries");
    expect(embed?.footer?.text).toBe("123 visits tracked in total");
  });

  it("lists the top pages with title, path, and count", () => {
    const embed = dailyReportMessage(buildDailySummary(fixtureVisits, 123, NOW))
      .embeds?.[0];
    expect(embed?.fields?.[0]?.name).toBe("Top pages");
    const value = embed?.fields?.[0]?.value ?? "";
    expect(value).toContain("**Hello** `/blogs/hello` — 2 visits");
    expect(value).toContain("`/about` — 1 visit");
  });

  it("sends a quiet day as one honest line, with no top-pages field", () => {
    const embed = dailyReportMessage(buildDailySummary([], 123, NOW)).embeds?.[0];
    expect(embed?.description).toContain("No visits");
    expect(embed?.fields).toBeUndefined();
  });

  it("clamps a pathologically long top-pages list to the embed field limit", () => {
    const padded = Array.from({ length: 5 }, (_, i) =>
      visit(`q${i}`, "2026-09-23T10:00:00.000Z", `/p${i}`, {
        title: `Very long title ${i} `.repeat(60),
      })
    );
    const value = dailyReportMessage(buildDailySummary(padded, 5, NOW)).embeds?.[0]
      ?.fields?.[0]?.value;
    expect((value ?? "").length).toBeLessThanOrEqual(1024);
    expect((value ?? "").endsWith("…")).toBe(true);
  });
});

describe("sendDailyActivityReport", () => {
  it("skips without Discord, and never reads the store or sends", async () => {
    setLiveEnv();
    const outcome = await sendDailyActivityReport(NOW);
    expect(outcome).toEqual({ sent: false, skipped: "no_discord", summary: null });
    expect(sendCalls).toHaveLength(0);
  });

  it("skips a static deployment without touching the store", async () => {
    setDiscordEnv();
    const outcome = await sendDailyActivityReport(NOW);
    expect(outcome).toEqual({ sent: false, skipped: "no_store", summary: null });
    expect(sendCalls).toHaveLength(0);
  });

  it("reads the store, builds the summary, and posts the embed", async () => {
    setLiveEnv();
    setDiscordEnv();
    xrevrangeReturn = Object.fromEntries(
      fixtureVisits.map((v, i) => [`${1000 - i}-0`, { data: v }])
    );
    getReturn = 123;

    const outcome = await sendDailyActivityReport(NOW);
    expect(outcome.sent).toBe(true);
    if (!outcome.sent) return; // narrows for the compiler; asserted above
    expect(outcome.summary?.visits).toBe(4);
    expect(outcome.summary?.total).toBe(123);

    expect(sendCalls).toHaveLength(1);
    expect(sendCalls[0]?.embeds?.[0]?.title).toBe("Daily activity — 2026-09-23");
  });

  it("surfaces a Discord refusal as send_failed with the summary attached", async () => {
    setLiveEnv();
    setDiscordEnv();
    sendReturn = false;
    xrevrangeReturn = {};
    getReturn = 0;

    const outcome = await sendDailyActivityReport(NOW);
    expect(outcome.sent).toBe(false);
    if (outcome.sent) return;
    expect(outcome.skipped).toBe("send_failed");
    expect(outcome.summary?.visits).toBe(0);
  });
});
