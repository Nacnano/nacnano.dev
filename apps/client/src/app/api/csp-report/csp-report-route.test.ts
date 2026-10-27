import { afterAll, beforeEach, describe, expect, it, mock } from "bun:test";

/**
 * Boundary tests for `POST /api/csp-report`. The limiter and the sink are
 * mocked, same as `/api/report`: the handler throttles, parses both CSP
 * report shapes, and always answers a bare 204.
 */
import * as observability from "@/lib/observability";
import * as rateLimit from "@/lib/rateLimit";

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
  return new Request("https://www.nacnano.dev/api/csp-report", {
    method: "POST",
    headers: { "content-type": "application/csp-report" },
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

describe("POST /api/csp-report", () => {
  it("forwards a bounded violation and returns a bare 204", async () => {
    const res = await POST(
      reportRequest(
        JSON.stringify({
          "csp-report": {
            "document-uri": "https://www.nacnano.dev/ama?token=secret",
            "effective-directive": "script-src-elem",
            "blocked-uri": "inline",
            "script-sample": "self.__next_f.push",
            "original-policy": "script-src 'nonce-SUPER-SECRET-POLICY'",
          },
        })
      )
    );

    expect(res.status).toBe(204);
    expect(await res.text()).toBe("");
    expect(reports).toHaveLength(1);
    const { error, context } = reports[0]!;
    expect((error as Error).message).toBe(
      "script-src-elem blocked inline: self.__next_f.push"
    );
    expect(context).toEqual({
      scope: "csp-violation",
      source: "browser",
      url: "https://www.nacnano.dev/ama",
    });
    expect(JSON.stringify(reports[0])).not.toContain("SUPER-SECRET-POLICY");
    expect(JSON.stringify(reports[0])).not.toContain("token=secret");
  });

  it("forwards a Reporting API batch and stops after five", async () => {
    const batch = Array.from({ length: 6 }, (_, index) => ({
      type: "csp-violation",
      body: {
        documentURL: "https://www.nacnano.dev/",
        effectiveDirective: "script-src-elem",
        blockedURL: `https://evil.test/${index}.js`,
      },
    }));

    const res = await POST(reportRequest(JSON.stringify(batch)));

    expect(res.status).toBe(204);
    expect(reports).toHaveLength(5);
    expect((reports[0]!.error as Error).message).toContain("https://evil.test/0.js");
    expect((reports[4]!.error as Error).message).toContain("https://evil.test/4.js");
  });

  it("omits the page when the document URL is not a page", async () => {
    await POST(
      reportRequest(
        JSON.stringify({
          "csp-report": {
            "effective-directive": "script-src-elem",
            "blocked-uri": "inline",
            "document-uri": "javascript:alert(1)",
          },
        })
      )
    );

    expect(reports).toHaveLength(1);
    expect(reports[0]!.context).toEqual({
      scope: "csp-violation",
      source: "browser",
    });
  });

  it("does not forward extension noise", async () => {
    await POST(
      reportRequest(
        JSON.stringify({
          "csp-report": {
            "effective-directive": "script-src-elem",
            "blocked-uri": "inline",
            "source-file": "chrome-extension://abc/injected.js",
            "document-uri": "https://www.nacnano.dev/ama",
          },
        })
      )
    );
    expect(reports).toHaveLength(0);
  });

  it("stays silent for junk, an oversized body, and a throttled caller", async () => {
    for (const body of ["not json", "", "{}", "null"]) {
      const res = await POST(reportRequest(body));
      expect(res.status).toBe(204);
    }
    const oversized = await POST(
      reportRequest(JSON.stringify({ pad: "a".repeat(70_000) }))
    );
    expect(oversized.status).toBe(204);

    allowed = false;
    const throttled = await POST(
      reportRequest(
        JSON.stringify({
          "csp-report": { "effective-directive": "script-src", "blocked-uri": "inline" },
        })
      )
    );
    expect(throttled.status).toBe(204);
    expect(reports).toHaveLength(0);
  });
});
