import { describe, expect, it } from "bun:test";
import { isValidCursor, parseFeedPayload, parseVisitEvent } from "./activityTypes";

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

describe("parseVisitEvent", () => {
  it("accepts a minimal well-formed event", () => {
    expect(parseVisitEvent(base())).toEqual(base());
  });

  it("accepts a JSON string", () => {
    expect(parseVisitEvent(JSON.stringify(base()))).toMatchObject({ id: "v1" });
  });

  it("requires id, a parseable timestamp, and an internal page", () => {
    expect(parseVisitEvent({ ...base(), id: "" })).toBeNull();
    expect(parseVisitEvent({ ...base(), ts: "not-a-date" })).toBeNull();
    expect(parseVisitEvent({ ...base(), ts: 123 })).toBeNull();
    expect(parseVisitEvent({ ...base(), page: "https://evil.example/x" })).toBeNull();
    expect(parseVisitEvent({ ...base(), page: "//evil.example" })).toBeNull();
    expect(parseVisitEvent({ ...base(), page: "/a".repeat(300) })).toBeNull();
    expect(parseVisitEvent(null)).toBeNull();
    expect(parseVisitEvent("not json")).toBeNull();
  });

  it("normalises a country code and drops an invalid one", () => {
    expect(parseVisitEvent({ ...base(), countryCode: " th " })).toMatchObject({
      countryCode: "TH",
    });
    const noCode = parseVisitEvent({ ...base(), countryCode: "Thailand" });
    expect(noCode?.countryCode).toBeUndefined();
  });

  it("keeps coordinates only as an in-range pair", () => {
    expect(parseVisitEvent({ ...base(), lat: 13.7, lng: 100.5 })).toMatchObject({
      lat: 13.7,
      lng: 100.5,
    });
    // A lone axis is dropped (never Null Island).
    expect(parseVisitEvent({ ...base(), lat: 13.7 })).not.toHaveProperty("lat");
    // Out-of-range values are dropped together.
    const bad = parseVisitEvent({ ...base(), lat: 999, lng: 100 });
    expect(bad).not.toHaveProperty("lat");
    expect(bad).not.toHaveProperty("lng");
  });

  it("bounds optional text and drops blanks/overlong as absent", () => {
    expect(parseVisitEvent({ ...base(), title: "  Hi  " })).toMatchObject({
      title: "Hi",
    });
    expect(parseVisitEvent({ ...base(), title: "   " })).not.toHaveProperty("title");
    expect(parseVisitEvent({ ...base(), title: "x".repeat(500) })).not.toHaveProperty(
      "title"
    );
  });

  it("strips unknown fields rather than forwarding them to render", () => {
    const parsed = parseVisitEvent({ ...base(), evil: { nested: true } });
    expect(Object.keys(parsed!).sort()).toEqual(["id", "page", "ts"]);
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
