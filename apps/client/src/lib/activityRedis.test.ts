import { describe, expect, it } from "bun:test";
import {
  coarsenCoordinate,
  coerceVisit,
  parseStreamEntries,
  visitEvent,
} from "./activityRedis";

const visit = {
  id: "v1",
  ts: "2026-09-14T03:00:00.000Z",
  page: "/projects",
  title: "Projects",
  countryCode: "TH",
};

describe("coerceVisit", () => {
  it("accepts an already-parsed object (Upstash parses stream values)", () => {
    expect(coerceVisit(visit)).toMatchObject({ id: "v1", page: "/projects" });
  });

  it("accepts a raw JSON string", () => {
    expect(coerceVisit(JSON.stringify(visit))).toMatchObject({ id: "v1" });
  });

  it("rejects non-visit shapes", () => {
    expect(coerceVisit(null)).toBeNull();
    expect(coerceVisit({ id: "x" })).toBeNull();
    expect(coerceVisit("not json")).toBeNull();
  });
});

describe("parseStreamEntries", () => {
  it("reads the object-keyed-by-id form Upstash actually returns, keeping the id as the cursor", () => {
    const entries = { "1700000000000-0": { data: visit } };
    const [entry] = parseStreamEntries(entries);
    expect(entry).toBeDefined();
    expect(entry!.id).toBe("1700000000000-0");
    expect(coerceVisit(entry!.fields.data)).toMatchObject({ id: "v1" });
  });

  it("reads the array-of-entries form and keeps each stream id", () => {
    const entries = [
      ["1-0", ["data", JSON.stringify(visit)]],
      ["2-0", ["data", JSON.stringify({ ...visit, id: "v2" })]],
    ];
    const parsed = parseStreamEntries(entries);
    expect(parsed.map((e) => e.id)).toEqual(["1-0", "2-0"]);
    expect(coerceVisit(parsed[1]!.fields.data)).toMatchObject({ id: "v2" });
  });

  it("reads a single unwrapped entry", () => {
    const [entry] = parseStreamEntries(["1-0", ["data", JSON.stringify(visit)]]);
    expect(entry).toBeDefined();
    expect(entry!.id).toBe("1-0");
  });

  it("returns nothing for an empty stream", () => {
    expect(parseStreamEntries([])).toEqual([]);
    expect(parseStreamEntries({})).toEqual([]);
    expect(parseStreamEntries(undefined)).toEqual([]);
  });
});

describe("coarsenCoordinate", () => {
  it("rounds to one decimal place (~10 km)", () => {
    expect(coarsenCoordinate(13.7563)).toBe(13.8);
    expect(coarsenCoordinate(100.5018)).toBe(100.5);
  });

  it("is undefined-safe for missing or non-finite values", () => {
    expect(coarsenCoordinate(undefined)).toBeUndefined();
    expect(coarsenCoordinate(Number.NaN)).toBeUndefined();
  });
});

describe("visitEvent", () => {
  it("stamps an id + timestamp and coarsens coordinates", () => {
    const event = visitEvent({
      path: "/blogs/x",
      title: "  Hi  ",
      lat: 13.7563,
      lng: 100.5018,
    });
    expect(event.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(event.ts).toMatch(/Z$/);
    expect(event.page).toBe("/blogs/x");
    expect(event.title).toBe("Hi");
    expect(event.lat).toBe(13.8);
    expect(event.lng).toBe(100.5);
  });

  it("drops a blank title and keeps missing coordinates absent", () => {
    const event = visitEvent({ path: "/", title: "   " });
    expect(event.title).toBeUndefined();
    expect(event.lat).toBeUndefined();
  });
});
