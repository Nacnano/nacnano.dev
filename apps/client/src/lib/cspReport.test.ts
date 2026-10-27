import { describe, expect, it } from "bun:test";

import { describeCspViolation, parseCspReports } from "./cspReport";

const SECRET_POLICY = "script-src 'nonce-SUPER-SECRET-POLICY'";
const PAGE = "https://www.nacnano.dev/ama?token=secret#hash";

describe("parseCspReports", () => {
  it("reads a report-uri body and drops the policy, query, and fragment", () => {
    const [violation] = parseCspReports({
      "csp-report": {
        "document-uri": PAGE,
        "effective-directive": "script-src-elem",
        "violated-directive": "script-src",
        "blocked-uri": "inline",
        "script-sample": "self.__next_f.push",
        "original-policy": SECRET_POLICY,
        disposition: "enforce",
      },
    });

    expect(violation).toEqual({
      directive: "script-src-elem",
      blocked: "inline",
      documentUrl: "https://www.nacnano.dev/ama",
      sample: "self.__next_f.push",
    });
    expect(JSON.stringify(violation)).not.toContain("SUPER-SECRET-POLICY");
    expect(JSON.stringify(violation)).not.toContain("token=secret");
  });

  it("reads a Reporting API batch and describes it like report-uri", () => {
    const legacy = parseCspReports({
      "csp-report": {
        "document-uri": PAGE,
        "effective-directive": "script-src-elem",
        "blocked-uri": "inline",
        "script-sample": "self.__next_f.push",
      },
    });
    const modern = parseCspReports([
      {
        type: "csp-violation",
        body: {
          documentURL: PAGE,
          effectiveDirective: "script-src-elem",
          blockedURL: "inline",
          sample: "self.__next_f.push",
          originalPolicy: SECRET_POLICY,
        },
      },
      { type: "deprecation", body: { id: "something-else" } },
      { type: "csp-violation", body: [] },
      null,
    ]);

    expect(modern).toEqual(legacy);
    expect(describeCspViolation(modern[0]!)).toBe(
      "script-src-elem blocked inline: self.__next_f.push"
    );
    expect(describeCspViolation(modern[0]!)).toBe(describeCspViolation(legacy[0]!));
  });

  it("falls back to violated-directive and redacts data URLs", () => {
    const [violation] = parseCspReports({
      "csp-report": {
        "violated-directive": "script-src",
        "blocked-uri": "data:text/javascript,alert(1)",
        "document-uri": "not a url",
      },
    });

    expect(violation).toEqual({
      directive: "script-src",
      blocked: "data:",
      documentUrl: "",
      sample: "",
    });
    expect(describeCspViolation(violation!)).toBe("script-src blocked data:");
  });

  it("drops extension noise, report-only bodies, and a missing directive", () => {
    expect(
      parseCspReports({
        "csp-report": {
          "effective-directive": "script-src-elem",
          "blocked-uri": "inline",
          "source-file": "chrome-extension://abc/injected.js",
        },
      })
    ).toEqual([]);
    expect(
      parseCspReports({
        "csp-report": {
          "effective-directive": "script-src",
          "blocked-uri": "moz-extension://abc/x.js",
        },
      })
    ).toEqual([]);
    expect(
      parseCspReports({
        "csp-report": {
          disposition: "report",
          "effective-directive": "script-src-elem",
          "blocked-uri": "inline",
        },
      })
    ).toEqual([]);
    expect(parseCspReports({ "csp-report": { "blocked-uri": "inline" } })).toEqual([]);
    expect(parseCspReports(null)).toEqual([]);
    expect(parseCspReports("nope")).toEqual([]);
    expect(parseCspReports({})).toEqual([]);
  });

  it("caps a long sample and collapses whitespace", () => {
    const sample = `  ${"a".repeat(200)}\nmore`;
    const [violation] = parseCspReports({
      "csp-report": {
        "effective-directive": "script-src-elem",
        "blocked-uri": "inline",
        "script-sample": sample,
      },
    });

    expect(violation!.sample).toHaveLength(80);
    expect(violation!.sample).not.toContain("\n");
  });

  it("describes a violation that names nothing blocked", () => {
    const [violation] = parseCspReports({
      "csp-report": { "effective-directive": "script-src-elem" },
    });

    expect(describeCspViolation(violation!)).toBe(
      "script-src-elem blocked unknown source"
    );
  });
});
