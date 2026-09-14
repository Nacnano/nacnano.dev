import { describe, expect, it } from "bun:test";
import {
  aggregateByCountry,
  countCountries,
  countryFlag,
  formatRelative,
  groupByDay,
  isInternalPath,
  mergeById,
  sortVisitsDesc,
  topPages,
  trackedDays,
  visitMarkers,
} from "./activity";
import type { VisitEvent } from "./activityTypes";

function visit(partial: Partial<VisitEvent>): VisitEvent {
  return {
    id: partial.id ?? "x",
    ts: partial.ts ?? "2026-09-14T00:00:00.000Z",
    page: partial.page ?? "/",
    ...partial,
  };
}

describe("sortVisitsDesc", () => {
  it("orders newest first", () => {
    const sorted = sortVisitsDesc([
      visit({ id: "old", ts: "2026-09-01T00:00:00.000Z" }),
      visit({ id: "new", ts: "2026-09-14T00:00:00.000Z" }),
    ]);
    expect(sorted.map((v) => v.id)).toEqual(["new", "old"]);
  });

  it("does not mutate the input", () => {
    const input = [visit({ id: "a" }), visit({ id: "b" })];
    sortVisitsDesc(input);
    expect(input.map((v) => v.id)).toEqual(["a", "b"]);
  });
});

describe("groupByDay", () => {
  it("buckets by UTC calendar day, newest day first", () => {
    const days = groupByDay([
      visit({ id: "1", ts: "2026-09-14T23:30:00.000Z" }),
      visit({ id: "2", ts: "2026-09-14T01:00:00.000Z" }),
      visit({ id: "3", ts: "2026-09-12T12:00:00.000Z" }),
    ]);
    expect(days.map((d) => d.day)).toEqual(["2026-09-14", "2026-09-12"]);
    expect(days[0]?.visits.map((v) => v.id)).toEqual(["1", "2"]);
  });

  it("returns nothing for an empty feed", () => {
    expect(groupByDay([])).toEqual([]);
  });
});

describe("formatRelative", () => {
  const now = new Date("2026-09-14T12:00:00.000Z").getTime();

  it("collapses the newest events", () => {
    expect(formatRelative("2026-09-14T11:59:30.000Z", now)).toBe("just now");
  });

  it("shows minutes, hours, then days", () => {
    expect(formatRelative("2026-09-14T11:55:00.000Z", now)).toBe("5m");
    expect(formatRelative("2026-09-14T09:00:00.000Z", now)).toBe("3h");
    expect(formatRelative("2026-09-12T12:00:00.000Z", now)).toBe("2d");
  });

  it("falls back to an absolute label past a week", () => {
    expect(formatRelative("2026-09-01T12:00:00.000Z", now)).toBe("Sep 1");
  });

  it("survives a garbage timestamp", () => {
    expect(formatRelative("not-a-date", now)).toBe("");
  });
});

describe("countryFlag", () => {
  it("turns a code into a flag", () => {
    expect(countryFlag("TH")).toBe("\u{1F1F9}\u{1F1ED}");
    expect(countryFlag("us")).toBe("\u{1F1FA}\u{1F1F8}");
  });

  it("returns empty for missing or malformed codes", () => {
    expect(countryFlag(undefined)).toBe("");
    expect(countryFlag("THA")).toBe("");
    expect(countryFlag("1A")).toBe("");
  });
});

describe("visitMarkers", () => {
  it("merges repeated locations into one scaled marker", () => {
    const markers = visitMarkers([
      visit({ id: "1", lat: 13.7563, lng: 100.5018 }),
      visit({ id: "2", lat: 13.7563, lng: 100.5018 }),
      visit({ id: "3", lat: 35.6762, lng: 139.6503 }),
    ]);
    expect(markers).toHaveLength(2);
    const bangkok = markers.find((m) => m.location[0] === 13.7563);
    expect(bangkok?.size).toBeGreaterThan(
      markers.find((m) => m.location[0] === 35.6762)?.size ?? 0
    );
  });

  it("ignores visits with no coordinates", () => {
    expect(visitMarkers([visit({ id: "1" })])).toEqual([]);
  });
});

describe("aggregateByCountry", () => {
  it("counts visits per country, highest first", () => {
    const agg = aggregateByCountry([
      visit({ id: "1", countryCode: "th" }),
      visit({ id: "2", countryCode: "TH" }),
      visit({ id: "3", countryCode: "JP" }),
      visit({ id: "4" }), // no country, skipped
    ]);
    expect(agg[0]).toMatchObject({ countryCode: "TH", count: 2 });
    expect(agg[1]).toMatchObject({ countryCode: "JP", count: 1 });
    expect(agg).toHaveLength(2);
  });

  it("keeps the first city and coordinates seen for a country", () => {
    const agg = aggregateByCountry([
      visit({ id: "1", countryCode: "TH", city: "Bangkok", lat: 13.75, lng: 100.5 }),
      visit({ id: "2", countryCode: "TH", city: "Chiang Mai", lat: 18.78, lng: 98.98 }),
    ]);
    expect(agg[0]).toMatchObject({ city: "Bangkok", lat: 13.75 });
  });
});

describe("topPages", () => {
  it("orders pages by view count", () => {
    const pages = topPages([
      visit({ id: "1", page: "/", title: "Writing" }),
      visit({ id: "2", page: "/projects" }),
      visit({ id: "3", page: "/" }),
    ]);
    expect(pages[0]).toMatchObject({ page: "/", count: 2, title: "Writing" });
    expect(pages[1]).toMatchObject({ page: "/projects", count: 1 });
  });
});

describe("countCountries", () => {
  it("counts distinct country codes, case-insensitively", () => {
    expect(
      countCountries([
        visit({ id: "1", countryCode: "TH" }),
        visit({ id: "2", countryCode: "th" }),
        visit({ id: "3", countryCode: "JP" }),
        visit({ id: "4" }),
      ])
    ).toBe(2);
  });
});

describe("trackedDays", () => {
  it("counts inclusive calendar days", () => {
    expect(trackedDays("2026-09-12T00:00:00.000Z", "2026-09-14T00:00:00.000Z")).toBe(3);
  });

  it("is never below one", () => {
    expect(trackedDays("2026-09-14T00:00:00.000Z", "2026-09-14T00:00:00.000Z")).toBe(1);
  });
});

describe("formatRelative boundaries", () => {
  const now = new Date("2026-09-14T12:00:00.000Z").getTime();
  const ago = (seconds: number) => new Date(now - seconds * 1000).toISOString();

  it("flips from 'just now' to minutes at 60 seconds (never renders 0m)", () => {
    expect(formatRelative(ago(45), now)).toBe("just now");
    expect(formatRelative(ago(59), now)).toBe("just now");
    expect(formatRelative(ago(60), now)).toBe("1m");
  });

  it("flips from days to an absolute label at 7 days", () => {
    expect(formatRelative(ago(6 * 86_400), now)).toBe("6d");
    expect(formatRelative(ago(7 * 86_400), now)).toBe("Sep 7");
  });
});

describe("mergeById", () => {
  it("de-duplicates a re-reported visit by id on a poll", () => {
    const existing = [visit({ id: "a", ts: "2026-09-14T12:00:00.000Z" })];
    const incoming = [
      visit({ id: "a", ts: "2026-09-14T12:00:00.000Z", title: "re-poll" }),
      visit({ id: "b", ts: "2026-09-14T12:00:05.000Z" }),
    ];
    const merged = mergeById(existing, incoming);
    expect(merged.map((v) => v.id)).toEqual(["b", "a"]);
    // The existing entry wins, so the re-poll's mutated copy is discarded.
    expect(merged.find((v) => v.id === "a")?.title).toBeUndefined();
  });

  it("keeps the list newest-first across both inputs", () => {
    const merged = mergeById(
      [visit({ id: "old", ts: "2026-09-13T00:00:00.000Z" })],
      [visit({ id: "new", ts: "2026-09-14T00:00:00.000Z" })]
    );
    expect(merged.map((v) => v.id)).toEqual(["new", "old"]);
  });
});

describe("isInternalPath", () => {
  it("accepts the site's real route shapes", () => {
    for (const path of [
      "/",
      "/about",
      "/activity",
      "/blogs/teaching-failure",
      "/blogs/post.v2",
      "/blogs/caf%C3%A9",
      "/blogs/%E0%B8%AA%E0%B8%9A%E0%B8%9A",
    ]) {
      expect(isInternalPath(path)).toBe(true);
    }
  });

  it("rejects anything that could become an outbound or script link", () => {
    for (const path of [
      "https://evil.example/x",
      "//evil.example",
      "/\\evil.example",
      "javascript:alert(1)",
      "/a b",
      "/blogs/../etc",
      // Encoded traversal must not slip past once `%` is in the alphabet.
      "/blogs/%2e%2e/%2e%2e/etc",
      "/%2e%2e/admin",
      "/blogs/%2E%2E/x",
      "about",
      "",
    ]) {
      expect(isInternalPath(path)).toBe(false);
    }
  });

  it("rejects a malformed percent-escape rather than throwing", () => {
    // decodeURIComponent("%") would throw; the guard turns it into a rejection.
    expect(isInternalPath("/a%zz")).toBe(false);
    expect(isInternalPath("/%")).toBe(false);
  });

  it("rejects non-strings", () => {
    expect(isInternalPath(undefined)).toBe(false);
    expect(isInternalPath(42)).toBe(false);
  });
});
