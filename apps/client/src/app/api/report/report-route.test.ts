import { describe, it, expect, beforeEach, afterAll, mock } from "bun:test";

/**
 * Boundary tests for `POST /api/report` — the browser's same-origin error egress.
 * The collaborators are mocked (the limiter, and the sink that forwards onward)
 * so we drive the handler's contract directly: it throttles, bounds and
 * re-derives the body, never trusts a client-supplied stack, and always answers
 * a bare 204 so a probe learns nothing about the limiter or the sink behind it.
 */
import * as rateLimit from "@/lib/rateLimit";
import * as observability from "@/lib/observability";

const originalRateLimit = { ...rateLimit };
const originalObservability = { ...observability };

type Reported = { error: unknown; context: Record<string, unknown> };
let reports: Reported[] = [];
let allowed = true;

mock.module("@/lib/rateLimit", () => ({
  ...originalRateLimit,
  allowReport: async () => allowed,
  clientIp: () => "203.0.113.7",
}));
mock.module("@/lib/observability", () => ({
  captureError: (error: unknown, context: Record<string, unknown> = {}) => {
    reports.push({ error, context });
  },
}));

import { POST } from "./route";

function reportRequest(body: BodyInit) {
  return new Request("https://nacnano.dev/api/report", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
  });
}

beforeEach(() => {
  reports = [];
  allowed = true;
});

afterAll(() => {
  mock.module("@/lib/rateLimit", () => originalRateLimit);
  mock.module("@/lib/observability", () => originalObservability);
  mock.restore();
});

describe("POST /api/report", () => {
  it("reports a bounded payload and returns a bare 204", async () => {
    const res = await POST(
      reportRequest(
        JSON.stringify({
          name: "TypeError",
          message: "x is not a function",
          scope: "route-error",
          digest: "deadbeef",
          url: "https://nacnano.dev/activity",
        })
      )
    );
    expect(res.status).toBe(204);
    expect(await res.text()).toBe("");
    expect(reports).toHaveLength(1);
    const { error, context } = reports[0]!;
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).name).toBe("TypeError");
    expect((error as Error).message).toBe("x is not a function");
    expect(context).toMatchObject({
      scope: "route-error",
      digest: "deadbeef",
      url: "https://nacnano.dev/activity",
      source: "browser",
    });
  });

  it("never forwards a client-supplied stack", async () => {
    await POST(
      reportRequest(
        JSON.stringify({
          message: "boom",
          stack: "at attackerFrame (https://evil.test/x.js:1:1)",
        })
      )
    );
    expect(reports).toHaveLength(1);
    const { error, context } = reports[0]!;
    // The reported error carries a server-generated stack, never the client's.
    expect((error as Error).stack).not.toContain("evil.test");
    expect(JSON.stringify(context)).not.toContain("evil.test");
    expect(context).not.toHaveProperty("stack");
  });

  it("drops oversized fields rather than storing them", async () => {
    await POST(
      reportRequest(
        JSON.stringify({
          message: "m".repeat(5_000),
          url: "https://nacnano.dev/".padEnd(1_000, "a"),
          scope: "s".repeat(500),
        })
      )
    );
    // A >2000-char message is dropped → falls back to the (present) name? none →
    // nothing reportable. Here message is over the cap so it is undefined and no
    // name is supplied, so the whole report is skipped.
    expect(reports).toHaveLength(0);
  });

  it("ignores an oversized body before parsing it", async () => {
    await POST(reportRequest(JSON.stringify({ message: "a".repeat(9_000) })));
    expect(reports).toHaveLength(0);
  });

  it("accepts a report that carries only a name (no message)", async () => {
    await POST(reportRequest(JSON.stringify({ name: "RangeError" })));
    expect(reports).toHaveLength(1);
    expect((reports[0]!.error as Error).name).toBe("RangeError");
  });

  it("accepts and stays silent for junk, malformed, or empty bodies", async () => {
    for (const body of ["not json", "", "{}", JSON.stringify([1, 2, 3]), "null"]) {
      const res = await POST(reportRequest(body));
      expect(res.status).toBe(204);
    }
    // Malformed / empty shapes have no name or message, so nothing is reported;
    // none of them may throw or leak whether they parsed.
    expect(reports).toHaveLength(0);
  });

  it("throttles a flood and never reports past the ceiling", async () => {
    allowed = false;
    const res = await POST(reportRequest(JSON.stringify({ message: "spam" })));
    expect(res.status).toBe(204);
    expect(reports).toHaveLength(0);
  });

  it("defaults an absent scope to client-report", async () => {
    await POST(reportRequest(JSON.stringify({ message: "something failed" })));
    expect(reports).toHaveLength(1);
    expect(reports[0]!.context.scope).toBe("client-report");
  });
});
