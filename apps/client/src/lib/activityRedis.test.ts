import { describe, expect, it } from "bun:test";
import { coerceVisit, normaliseEntries } from "./activityRedis";

describe("coerceVisit", () => {
  const visit = {
    id: "v1",
    ts: "2026-09-14T03:00:00.000Z",
    page: "/projects",
    title: "Projects",
    countryCode: "TH",
  };

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

describe("normaliseEntries", () => {
  it("handles the object-keyed-by-id form Upstash actually returns", () => {
    const entries = { "1-0": { data: { id: "v1", ts: "t", page: "/" } } };
    const records = normaliseEntries(entries);
    expect(records).toHaveLength(1);
    expect(records[0].data).toMatchObject({ id: "v1" });
  });

  it("handles the raw array-of-entries form", () => {
    const entries = [["1-0", ["data", '{"id":"v1","ts":"t","page":"/"}']]];
    const records = normaliseEntries(entries);
    expect(records).toHaveLength(1);
    expect(coerceVisit(records[0].data)).toMatchObject({ id: "v1" });
  });

  it("returns nothing for an empty stream", () => {
    expect(normaliseEntries([])).toEqual([]);
    expect(normaliseEntries({})).toEqual([]);
    expect(normaliseEntries(undefined)).toEqual([]);
  });
});
