import { describe, expect, it } from "bun:test";
import {
  isValidCursor,
  parseFeedPayload,
  parsePublicVisit,
  parseStoredVisit,
} from "./activityTypes";

function base() {
  return { id: "v1", ts: "2026-09-14T03:00:00.000Z", page: "/projects" };
}

describe("isValidCursor", () => {
  it("accepts the <ms>-<seq> grammar and nothing else", () => {
    expect(isValidCursor("1700000000000-0")).toBe(true);
    expect(isValidCursor("1-0")).toBe(true);
    expect(isValidCursor("1700000000000")).toBe(false);
    expect(isValidCursor("abc-def")).toBe(false);
    expect(isValidCursor(123)).toBe(false);
  });
});

describe("parseStoredVisit", () => {
  it("accepts a minimal well-formed event and tags it v2", () => {
    expect(parseStoredVisit(base())).toEqual({ ...base(), v: 2 });
  });

  it("lifts an unversioned (v1) row rather than rejecting it — no backfill needed", () => {
    const v1 = { id: "old", ts: "2026-01-01T00:00:00.000Z", page: "/blogs/x" };
    expect(parseStoredVisit(v1)).toEqual({ ...v1, v: 2 });
  });

  it("round-trips a v2 row, keeping the discriminator", () => {
    expect(parseStoredVisit({ ...base(), v: 2 })).toEqual({ ...base(), v: 2 });
  });

  it("accepts a JSON string", () => {
    expect(parseStoredVisit(JSON.stringify(base()))).toMatchObject({ id: "v1" });
  });

  it("requires id, a parseable timestamp, and an internal page", () => {
    expect(parseStoredVisit({ ...base(), id: "" })).toBeNull();
    expect(parseStoredVisit({ ...base(), ts: "not-a-date" })).toBeNull();
    expect(parseStoredVisit({ ...base(), ts: 123 })).toBeNull();
    expect(parseStoredVisit({ ...base(), page: "https://evil.example/x" })).toBeNull();
    expect(parseStoredVisit({ ...base(), page: "//evil.example" })).toBeNull();
    expect(parseStoredVisit({ ...base(), page: "/a".repeat(300) })).toBeNull();
    expect(parseStoredVisit(null)).toBeNull();
    expect(parseStoredVisit("not json")).toBeNull();
  });

  it("normalises a country code and drops an invalid one", () => {
    expect(parseStoredVisit({ ...base(), countryCode: " th " })).toMatchObject({
      countryCode: "TH",
    });
    const noCode = parseStoredVisit({ ...base(), countryCode: "Thailand" });
    expect(noCode?.countryCode).toBeUndefined();
  });

  it("keeps coordinates only as an in-range pair", () => {
    expect(parseStoredVisit({ ...base(), lat: 13.7, lng: 100.5 })).toMatchObject({
      lat: 13.7,
      lng: 100.5,
    });
    // A lone axis is dropped (never Null Island).
    expect(parseStoredVisit({ ...base(), lat: 13.7 })).not.toHaveProperty("lat");
    // Out-of-range values are dropped together.
    const bad = parseStoredVisit({ ...base(), lat: 999, lng: 100 });
    expect(bad).not.toHaveProperty("lat");
    expect(bad).not.toHaveProperty("lng");
  });

  it("bounds optional text and drops blanks/overlong as absent", () => {
    expect(parseStoredVisit({ ...base(), title: "  Hi  " })).toMatchObject({
      title: "Hi",
    });
    expect(parseStoredVisit({ ...base(), title: "   " })).not.toHaveProperty("title");
    expect(parseStoredVisit({ ...base(), title: "x".repeat(500) })).not.toHaveProperty(
      "title"
    );
  });

  it("strips unknown fields rather than forwarding them to render", () => {
    const parsed = parseStoredVisit({ ...base(), evil: { nested: true } });
    expect(Object.keys(parsed!).sort()).toEqual(["id", "page", "ts", "v"]);
  });
});

describe("parsePublicVisit", () => {
  it("parses the public shape and never carries coordinates", () => {
    const visit = parsePublicVisit({ ...base(), city: "Bangkok", countryCode: "TH" });
    expect(visit).toMatchObject({ id: "v1", city: "Bangkok", countryCode: "TH" });
    expect(visit).not.toHaveProperty("lat");
    expect(visit).not.toHaveProperty("lng");
  });

  it("rejects (null) a row that carries a coordinate pair — the leak guard", () => {
    expect(parsePublicVisit({ ...base(), lat: 13.7, lng: 100.5 })).toBeNull();
  });
});

describe("parseFeedPayload", () => {
  it("accepts a coherent page and keeps only valid rows", () => {
    const payload = parseFeedPayload({
      visits: [base(), { id: "bad" }, { ...base(), id: "v2", page: "//evil" }],
      count: 42,
      hasMore: true,
      nextCursor: "1700000000000-0",
    });
    expect(payload).not.toBeNull();
    expect(payload!.visits.map((v) => v.id)).toEqual(["v1"]);
    expect(payload!.count).toBe(42);
    expect(payload!.hasMore).toBe(true);
    expect(payload!.nextCursor).toBe("1700000000000-0");
  });

  it("rejects the WHOLE envelope if any row carries coordinates (keep last good)", () => {
    // A server regression that starts leaking lat/lng must fail the client parser
    // loudly, not silently drop the row and render the rest from private data.
    const leaked = parseFeedPayload({
      visits: [base(), { ...base(), id: "v2", lat: 13.7, lng: 100.5 }],
      count: 2,
    });
    expect(leaked).toBeNull();
  });

  it("keeps server-aggregated markers and drops malformed ones", () => {
    const payload = parseFeedPayload({
      visits: [base()],
      count: 1,
      markers: [
        { location: [13.7, 100.5], size: 0.2 },
        { location: ["nope", 1], size: 0.2 },
        { location: [1, 2], size: "big" },
      ],
    });
    expect(payload?.markers).toEqual([{ location: [13.7, 100.5], size: 0.2 }]);
  });

  it("treats an unusable envelope as a wholesale failure (null), not an empty feed", () => {
    expect(parseFeedPayload(null)).toBeNull();
    expect(parseFeedPayload({ count: 1 })).toBeNull(); // no visits array
    expect(parseFeedPayload({ visits: [], count: -1 })).toBeNull(); // negative
    expect(parseFeedPayload({ visits: [], count: 1.5 })).toBeNull(); // non-integer
    expect(
      parseFeedPayload({ visits: [], count: Number.MAX_SAFE_INTEGER + 10 })
    ).toBeNull();
    expect(
      parseFeedPayload({ visits: Array.from({ length: 300 }, () => base()), count: 300 })
    ).toBeNull(); // implausible page size
  });

  it("rejects inconsistent pagination fields", () => {
    expect(
      parseFeedPayload({ visits: [base()], count: 1, hasMore: true }) // no cursor
    ).toBeNull();
    expect(parseFeedPayload({ visits: [], count: 0, nextCursor: "garbage" })).toBeNull();
    expect(parseFeedPayload({ visits: [], count: 0, hasMore: "yes" })).toBeNull();
  });

  it("normalises a missing nextCursor to null when the field is present", () => {
    const payload = parseFeedPayload({ visits: [base()], count: 1, nextCursor: null });
    expect(payload?.nextCursor).toBeNull();
  });
});
