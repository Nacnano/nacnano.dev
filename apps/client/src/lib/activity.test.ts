import { describe, expect, it } from "bun:test";
import {
  activityMarkers,
  countryFlag,
  formatRelative,
  groupByDay,
  sortEventsDesc,
  trackedDays,
} from "./activity";
import type { ActivityEvent } from "./activityTypes";

function event(partial: Partial<ActivityEvent>): ActivityEvent {
  return {
    id: partial.id ?? "x",
    ts: partial.ts ?? "2026-09-14T00:00:00.000Z",
    kind: partial.kind ?? "visit",
    summary: partial.summary ?? "did a thing",
    ...partial,
  };
}

describe("sortEventsDesc", () => {
  it("orders newest first", () => {
    const sorted = sortEventsDesc([
      event({ id: "old", ts: "2026-09-01T00:00:00.000Z" }),
      event({ id: "new", ts: "2026-09-14T00:00:00.000Z" }),
    ]);
    expect(sorted.map((e) => e.id)).toEqual(["new", "old"]);
  });

  it("does not mutate the input", () => {
    const input = [event({ id: "a" }), event({ id: "b" })];
    sortEventsDesc(input);
    expect(input.map((e) => e.id)).toEqual(["a", "b"]);
  });
});

describe("groupByDay", () => {
  it("buckets by UTC calendar day, newest day first", () => {
    const days = groupByDay([
      event({ id: "1", ts: "2026-09-14T23:30:00.000Z" }),
      event({ id: "2", ts: "2026-09-14T01:00:00.000Z" }),
      event({ id: "3", ts: "2026-09-12T12:00:00.000Z" }),
    ]);
    expect(days.map((d) => d.day)).toEqual(["2026-09-14", "2026-09-12"]);
    expect(days[0].events.map((e) => e.id)).toEqual(["1", "2"]);
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

describe("activityMarkers", () => {
  it("merges repeated locations into one scaled marker", () => {
    const markers = activityMarkers([
      event({ id: "1", lat: 13.7563, lng: 100.5018 }),
      event({ id: "2", lat: 13.7563, lng: 100.5018 }),
      event({ id: "3", lat: 35.6762, lng: 139.6503 }),
    ]);
    expect(markers).toHaveLength(2);
    const bangkok = markers.find((m) => m.location[0] === 13.7563);
    expect(bangkok?.size).toBeGreaterThan(
      markers.find((m) => m.location[0] === 35.6762)?.size ?? 0
    );
  });

  it("ignores events with no coordinates", () => {
    expect(activityMarkers([event({ id: "1", kind: "coffee" })])).toEqual([]);
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
