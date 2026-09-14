import { describe, expect, it } from "bun:test";
import {
  aggregateByCountry,
  countCountries,
  countryFlag,
  formatRelative,
  groupByDay,
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
    expect(trackedDays("2026-09-12T00:00:00.000Z", "2026-09-14T00:00:00.000Z")).toBe(
      3
    );
  });

  it("is never below one", () => {
    expect(trackedDays("2026-09-14T00:00:00.000Z", "2026-09-14T00:00:00.000Z")).toBe(
      1
    );
  });
});
