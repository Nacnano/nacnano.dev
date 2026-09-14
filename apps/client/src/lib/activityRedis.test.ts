import { describe, expect, it } from "bun:test";
import { coerceVisit, parseStreamEntries } from "./activityRedis";

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
    const parsed = parseStreamEntries(entries);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].id).toBe("1700000000000-0");
    expect(coerceVisit(parsed[0].fields.data)).toMatchObject({ id: "v1" });
  });

  it("reads the array-of-entries form and keeps each stream id", () => {
    const entries = [
      ["1-0", ["data", JSON.stringify(visit)]],
      ["2-0", ["data", JSON.stringify({ ...visit, id: "v2" })]],
    ];
    const parsed = parseStreamEntries(entries);
    expect(parsed.map((entry) => entry.id)).toEqual(["1-0", "2-0"]);
    expect(coerceVisit(parsed[1].fields.data)).toMatchObject({ id: "v2" });
  });

  it("reads a single unwrapped entry", () => {
    const parsed = parseStreamEntries(["1-0", ["data", JSON.stringify(visit)]]);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].id).toBe("1-0");
  });

  it("returns nothing for an empty stream", () => {
    expect(parseStreamEntries([])).toEqual([]);
    expect(parseStreamEntries({})).toEqual([]);
    expect(parseStreamEntries(undefined)).toEqual([]);
  });
});
