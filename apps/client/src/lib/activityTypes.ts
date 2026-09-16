/**
 * The shared shape of the site-visit activity feed.
 *
 * This module is deliberately free of Node and Redis imports so it can be
 * pulled into client components, the route handlers, and the unit tests
 * without dragging server-only code across the bundle boundary.
 *
 * An event is a single page view on this site, tagged with roughly where in
 * the world it came from. That is the whole point of the page: an aggregation
 * of visits, not a log of anything else.
 */

// The day the counter starts from. Shown once in the feed header so a reader
// knows how far back the numbers go.
export const VISITS_TRACKED_SINCE = "2026-09-16";

export type VisitEvent = {
  id: string;
  /** ISO-8601 timestamp of when the page was viewed. */
  ts: string;
  /** The page path that was viewed, e.g. `/blogs/hello`. */
  page: string;
  /** A human title for the page, e.g. "Writing". Falls back to `page`. */
  title?: string;
  /** ISO 3166-1 alpha-2 country code of the visitor, when known. */
  countryCode?: string;
  /** City label of the visitor, when known. */
  city?: string;
  /** Coordinates for the globe marker, when geo resolution gave us any. */
  lat?: number;
  lng?: number;
  /** The Redis stream entry id, used as an opaque pagination cursor. */
  cursor?: string;
};

export type VisitFeedPayload = {
  visits: VisitEvent[];
  count: number;
  /** Cursor (oldest returned stream id) to ask for the next older page. */
  nextCursor?: string | null;
  /** Whether more, older visits exist beyond this page. */
  hasMore?: boolean;
};

export type VisitMarker = {
  location: [number, number];
  size: number;
};

/* -------------------------------------------------------------------------- *
 * Canonical runtime schema
 *
 * `isValidCursor` only checks the *shape* of a stream id, and the coarse
 * public-path screen below only rejects the obvious outbound-link shapes;
 * together they'd still let a malformed `title`, a bogus coordinate pair, or a
 * `countryCode` that isn't a country through to rendering. Everything from
 * `parseVisitEvent` down re-derives each field from validated primitives rather
 * than trusting what arrived, so React never sees an arbitrary object where it
 * expects a string/number, and an unparseable *envelope* reads as an upstream
 * failure (keep last-known-good) instead of a fabricated feed.
 * -------------------------------------------------------------------------- */

// Mirrors the write route's cap; a longer `page` is not a path we ever stored.
const MAX_PATH = 200;
const MAX_TITLE = 200;
const MAX_CITY = 100;
const MAX_ID = 64;
// How far back detailed visits reach, by count. Defined here (a client-safe,
// dependency-free module) as the single source of truth for the store's stream
// trim length, which `activityRedis` re-exports and the server render uses as
// the size of its one whole-window read.
export const STREAM_MAXLEN = 1500;
// Every page that crosses the network is bounded by `limit` (<=100) — the whole
// retained window reaches the client through the server render, never through
// this envelope — so anything larger than this slack is a corrupt or hostile
// response, not a real page.
const MAX_PAGE_ROWS = 200;
const CURSOR_PATTERN = /^\d+-\d+$/;
const COUNTRY_PATTERN = /^[A-Z]{2}$/;

/** A stream id looks like `<milliseconds>-<sequence>`; anything else is absent. */
export function isValidCursor(value: unknown): value is string {
  return typeof value === "string" && CURSOR_PATTERN.test(value);
}

/**
 * Coarse internal-path check for the public boundary. The authoritative guard
 * (`isInternalPath`, with full percent-decoding) lives in `activity.ts` and runs
 * on the server read path; here we reject the shapes that could otherwise render
 * as an outbound link (protocol, protocol-relative, traversal, oversize) using
 * only string checks, so this module stays free of the `activity` import.
 */
function isSafePublicPath(value: unknown): value is string {
  if (typeof value !== "string") return false;
  if (value.length === 0 || value.length > MAX_PATH) return false;
  if (!value.startsWith("/")) return false;
  if (value.startsWith("//") || value.startsWith("/\\")) return false;
  if (value.includes("://") || value.includes("..") || /\s/.test(value)) return false;
  return true;
}

function normalizeCountryCode(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const code = value.trim().toUpperCase();
  return COUNTRY_PATTERN.test(code) ? code : undefined;
}

function boundedText(value: unknown, max: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > max) return undefined;
  return trimmed;
}

/**
 * Rebuild a `VisitEvent` from untrusted input, or `null` when its required
 * identity (id / timestamp / page) is unusable. Optional fields are dropped
 * independently when malformed — a bad city must not discard an otherwise good
 * visit — but the two coordinates are kept or dropped *together*, so a lone
 * latitude can never pin a marker to Null Island.
 */
export function parseVisitEvent(value: unknown): VisitEvent | null {
  let candidate = value;
  if (typeof candidate === "string") {
    try {
      candidate = JSON.parse(candidate);
    } catch {
      return null;
    }
  }
  if (!candidate || typeof candidate !== "object") return null;
  const record = candidate as Record<string, unknown>;

  // id: new writes are UUIDs, but rows written before that (and test fixtures)
  // use opaque short ids, so bound the string rather than force one format.
  const id = typeof record.id === "string" ? record.id : "";
  if (id.length === 0 || id.length > MAX_ID) return null;

  // ts: must be a real ISO-8601 instant, not merely a string.
  if (typeof record.ts !== "string") return null;
  if (Number.isNaN(new Date(record.ts).getTime())) return null;

  if (!isSafePublicPath(record.page)) return null;

  const visit: VisitEvent = { id, ts: record.ts, page: record.page };

  const title = boundedText(record.title, MAX_TITLE);
  if (title) visit.title = title;

  const countryCode = normalizeCountryCode(record.countryCode);
  if (countryCode) visit.countryCode = countryCode;

  const city = boundedText(record.city, MAX_CITY);
  if (city) visit.city = city;

  const { lat, lng } = record;
  if (
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  ) {
    visit.lat = lat;
    visit.lng = lng;
  }

  if (isValidCursor(record.cursor)) visit.cursor = record.cursor;

  return visit;
}

/**
 * Parse a feed response from the network into a trustworthy payload, or `null`
 * for an unusable envelope. Individual corrupt rows are dropped; a broken
 * envelope (bad count, inconsistent pagination, implausible row count) is a
 * wholesale failure so the caller keeps its last-known-good feed rather than
 * rendering a confident zero.
 */
export function parseFeedPayload(value: unknown): VisitFeedPayload | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;

  if (!Array.isArray(record.visits) || record.visits.length > MAX_PAGE_ROWS) {
    return null;
  }
  if (
    typeof record.count !== "number" ||
    !Number.isSafeInteger(record.count) ||
    record.count < 0
  ) {
    return null;
  }

  if (record.hasMore !== undefined && typeof record.hasMore !== "boolean") {
    return null;
  }
  if (
    "nextCursor" in record &&
    record.nextCursor !== null &&
    !isValidCursor(record.nextCursor)
  ) {
    return null;
  }
  // Claiming more pages without a usable cursor is self-contradictory.
  if (record.hasMore === true && !isValidCursor(record.nextCursor)) {
    return null;
  }

  const visits: VisitEvent[] = [];
  for (const raw of record.visits) {
    const visit = parseVisitEvent(raw);
    if (visit) visits.push(visit);
  }

  const payload: VisitFeedPayload = { visits, count: record.count };
  if (typeof record.hasMore === "boolean") payload.hasMore = record.hasMore;
  if ("nextCursor" in record) {
    payload.nextCursor = isValidCursor(record.nextCursor) ? record.nextCursor : null;
  }
  return payload;
}
