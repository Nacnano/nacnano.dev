import { describe, it, expect, beforeEach, afterAll, mock } from "bun:test";

/**
 * Behaviour tests for `GET /api/cron/daily-report` — who may trigger the bot,
 * and what each outcome reads as. The report module is mocked at the boundary
 * (its own logic is covered in `lib/activityReport.test.ts`), so every branch
 * here — closed endpoint, rejected callers, skipped runs, a throwing store —
 * is driven deterministically without a store or a Discord.
 */
import * as activityReportReal from "@/lib/activityReport";
import * as observabilityReal from "@/lib/observability";

const originalReport = { ...activityReportReal };
const originalObservability = { ...observabilityReal };

let outcomeValue: unknown = { sent: true, summary: {} };
let throwOnCall: unknown = null;
let reportCalls = 0;
const capturedErrors: unknown[] = [];

mock.module("@/lib/activityReport", () => ({
  ...originalReport,
  sendDailyActivityReport: async () => {
    reportCalls += 1;
    if (throwOnCall) throw throwOnCall;
    return outcomeValue;
  },
}));
mock.module("@/lib/observability", () => ({
  ...originalObservability,
  captureError: (error: unknown) => {
    capturedErrors.push(error);
  },
}));

import { GET, matchesCronSecret } from "./route";

const SECRET = "s3cret-cron-token";
const originalSecret = process.env.CRON_SECRET;

function cronRequest(authorization?: string): Request {
  return new Request("https://www.nacnano.dev/api/cron/daily-report", {
    ...(authorization === undefined ? {} : { headers: { authorization } }),
  });
}

beforeEach(() => {
  process.env.CRON_SECRET = SECRET;
  outcomeValue = { sent: true, summary: { visits: 4, countries: 2, total: 123 } };
  throwOnCall = null;
  reportCalls = 0;
  capturedErrors.length = 0;
});

afterAll(() => {
  // `mock.module` is process-global — put both modules back for later files.
  mock.module("@/lib/activityReport", () => originalReport);
  mock.module("@/lib/observability", () => originalObservability);
  mock.restore();
  if (originalSecret === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = originalSecret;
});

describe("GET /api/cron/daily-report", () => {
  it("is closed, not open, when CRON_SECRET is unset", async () => {
    delete process.env.CRON_SECRET;
    const res = await GET(cronRequest(`Bearer ${SECRET}`));
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ ok: false, error: "not_configured" });
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(reportCalls).toBe(0);
  });

  it("rejects a caller with no Authorization header", async () => {
    const res = await GET(cronRequest());
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ ok: false, error: "unauthorized" });
    expect(reportCalls).toBe(0);
  });

  it("rejects the wrong scheme and the wrong token", async () => {
    expect((await GET(cronRequest(`Basic ${SECRET}`))).status).toBe(401);
    expect((await GET(cronRequest("Bearer not-the-token"))).status).toBe(401);
    // A near-miss differing in one character must not pass either.
    expect((await GET(cronRequest(`Bearer ${SECRET.slice(0, -1)}0`))).status).toBe(401);
    expect(reportCalls).toBe(0);
  });

  it("sends the report when Vercel's cron bearer matches", async () => {
    const res = await GET(cronRequest(`Bearer ${SECRET}`));
    expect(res.status).toBe(200);
    expect(reportCalls).toBe(1);
    expect(await res.json()).toMatchObject({
      ok: true,
      sent: true,
      summary: { visits: 4, countries: 2, total: 123 },
    });
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("reports a skipped run as a success that sent nothing", async () => {
    outcomeValue = { sent: false, skipped: "no_store", summary: null };
    const res = await GET(cronRequest(`Bearer ${SECRET}`));
    // 200, not 5xx: the run completed and explained itself; only an exception
    // should make the cron job look failed to Vercel.
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      ok: true,
      sent: false,
      skipped: "no_store",
    });
  });

  it("turns a throwing store into a 503 and an operator report", async () => {
    throwOnCall = new Error("upstash down");
    const res = await GET(cronRequest(`Bearer ${SECRET}`));
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ ok: false, error: "report_failed" });
    expect(capturedErrors).toHaveLength(1);
  });
});

describe("matchesCronSecret", () => {
  it("accepts only the byte-identical token", async () => {
    expect(await matchesCronSecret(SECRET, SECRET)).toBe(true);
    expect(await matchesCronSecret(`${SECRET}x`, SECRET)).toBe(false);
    expect(await matchesCronSecret("", SECRET)).toBe(false);
    expect(await matchesCronSecret("short", `${SECRET}-longer`)).toBe(false);
  });
});
