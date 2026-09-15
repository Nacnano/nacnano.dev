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
export const VISITS_TRACKED_SINCE = "2026-09-14";

/**
 * The shape of a stored site-visit event — the private, full-fidelity record.
 *
 * This is what the Redis stream holds and what the server read path re-derives
 * it into. It is *never* serialised to a browser as-is: coordinates and (below
 * the k-anonymity threshold) the city are dropped on the way out. See
 * `PublicVisit` for what the feed actually ships, and `toPublicVisit` for the
 * projection between the two.
 */
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

/**
 * A stored record with its shape tagged. `v` is a forward-only discriminator:
 * rows written before it existed carry no `v` and are lifted from v1 on read
 * (see `parseStoredVisit`), so retention can stay a plain expiry — there is no
 * backfill that could leave the store half-migrated.
 */
export type PrivateVisitEventV2 = VisitEvent & { v: 2 };

/**
 * What the public feed serialises — the *only* visit shape a browser may ever
 * see. Coordinates are absent by construction (they are not merely hidden, the
 * field does not exist), and `city` is populated only when the visit clears the
 * k-anonymity threshold in `toPublicVisit`; a lone visitor degrades to country
 * (then "somewhere") rather than being named.
 */
export type PublicVisit = {
  id: string;
  ts: string;
  page: string;
  title?: string;
  countryCode?: string;
  /** Present only when the city cleared the k-anonymity threshold. */
  city?: string;
  /** Opaque pagination cursor (the stream id). */
  cursor?: string;
};

export type VisitFeedPayload = {
  /** Projected, public rows — never the stored `VisitEvent` verbatim. */
  visits: PublicVisit[];
  count: number;
  /** Cursor (oldest returned stream id) to ask for the next older page. */
  nextCursor?: string | null;
  /** Whether more, older visits exist beyond this page. */
  hasMore?: boolean;
  /**
   * Globe points, aggregated server-side from the (private) rows behind this
   * page. Shipped instead of per-visit coordinates so a viewer can see the
   * density of a region without any single visit carrying its own lat/lng.
   */
  markers?: VisitMarker[];
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
 * `parseStoredVisit` / `parsePublicVisit` down re-derives each field from validated primitives rather
 * than trusting what arrived, so React never sees an arbitrary object where it
 * expects a string/number, and an unparseable *envelope* reads as an upstream
 * failure (keep last-known-good) instead of a fabricated feed.
 * -------------------------------------------------------------------------- */

// Mirrors the write route's cap; a longer `page` is not a path we ever stored.
const MAX_PATH = 200;
const MAX_TITLE = 200;
const MAX_CITY = 100;
const MAX_ID = 64;
// A public feed page is bounded by `limit` (<=100); anything larger than this
// slack is a corrupt/hostile envelope, not a real page.
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

/** Normalise a value (possibly a JSON string) into a record, or `null`. */
function asRecord(value: unknown): Record<string, unknown> | null {
  let candidate = value;
  if (typeof candidate === "string") {
    try {
      candidate = JSON.parse(candidate);
    } catch {
      return null;
    }
  }
  if (!candidate || typeof candidate !== "object") return null;
  return candidate as Record<string, unknown>;
}

/** The shared identity + label rebuild; each caller adds its own geo policy. */
function buildCore(record: Record<string, unknown>): PublicVisit | null {
  // id: new writes are UUIDs, but rows written before that (and test fixtures)
  // use opaque short ids, so bound the string rather than force one format.
  const id = typeof record.id === "string" ? record.id : "";
  if (id.length === 0 || id.length > MAX_ID) return null;

  // ts: must be a real ISO-8601 instant, not merely a string.
  if (typeof record.ts !== "string") return null;
  if (Number.isNaN(new Date(record.ts).getTime())) return null;

  if (!isSafePublicPath(record.page)) return null;

  const visit: PublicVisit = { id, ts: record.ts, page: record.page };

  const title = boundedText(record.title, MAX_TITLE);
  if (title) visit.title = title;

  const countryCode = normalizeCountryCode(record.countryCode);
  if (countryCode) visit.countryCode = countryCode;

  const city = boundedText(record.city, MAX_CITY);
  if (city) visit.city = city;

  if (isValidCursor(record.cursor)) visit.cursor = record.cursor;

  return visit;
}

function coordinatePair(
  record: Record<string, unknown>
): { lat: number; lng: number } | null {
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
    return { lat, lng };
  }
  return null;
}

/**
 * Rebuild the *stored* (private) record from untrusted input, or `null` when its
 * required identity is unusable. Accepts BOTH shapes: a row carrying no `v` is a
 * v1 entry and is lifted to `v: 2` with identical field semantics, which is what
 * lets retention stay a plain expiry instead of a migration. Coordinates are kept
 * or dropped *together* (never a lone axis → Null Island). This output is what the
 * server keeps in memory to compute markers and the k-anonymity threshold; it is
 * never handed to the browser.
 */
export function parseStoredVisit(value: unknown): PrivateVisitEventV2 | null {
  const record = asRecord(value);
  if (!record) return null;
  const core = buildCore(record);
  if (!core) return null;

  const visit: PrivateVisitEventV2 = { ...core, v: 2 };
  const coords = coordinatePair(record);
  if (coords) {
    visit.lat = coords.lat;
    visit.lng = coords.lng;
  }
  return visit;
}

/** A row that carries a usable coordinate pair — a leak if it reaches a browser. */
function hasCoordinates(value: unknown): boolean {
  const record = asRecord(value);
  return record !== null && coordinatePair(record) !== null;
}

/**
 * Rebuild a *public* row from the feed response. It is the same identity rebuild
 * with coordinates structurally impossible: `PublicVisit` has no lat/lng field,
 * so nothing here can add one. A leaked `city` is caught separately by the k-anon
 * projection on the server; this parser's job is the coordinate guarantee, which
 * it enforces by *rejecting* (returning `null`) any row that carries one — see
 * `parseFeedPayload`, which turns that into a wholesale rejection.
 */
export function parsePublicVisit(value: unknown): PublicVisit | null {
  if (hasCoordinates(value)) return null;
  const record = asRecord(value);
  if (!record) return null;
  return buildCore(record);
}

function parseMarkers(value: unknown): VisitMarker[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const markers: VisitMarker[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object") continue;
    const marker = raw as Record<string, unknown>;
    const location = marker.location;
    if (
      !Array.isArray(location) ||
      location.length !== 2 ||
      typeof location[0] !== "number" ||
      typeof location[1] !== "number" ||
      !Number.isFinite(location[0]) ||
      !Number.isFinite(location[1])
    ) {
      continue;
    }
    const size =
      typeof marker.size === "number" && Number.isFinite(marker.size)
        ? marker.size
        : undefined;
    if (size === undefined) continue;
    markers.push({ location: [location[0], location[1]], size });
  }
  return markers;
}

/**
 * Parse a feed response from the network into a trustworthy *public* payload, or
 * `null` for an unusable envelope. Individual corrupt rows are dropped; a broken
 * envelope (bad count, inconsistent pagination, implausible row count) — and,
 * critically, any row that carries coordinates — is a *wholesale* failure, so the
 * client keeps its last-known-good feed rather than rendering a leak or a
 * confident zero. A server regression that starts emitting lat/lng therefore fails
 * this parser loudly instead of quietly drawing the globe from private data.
 */
export function parseFeedPayload(value: unknown): VisitFeedPayload | null {
  const record = asRecord(value);
  if (!record) return null;

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

  const visits: PublicVisit[] = [];
  for (const raw of record.visits) {
    // A coordinate-bearing row is a server-side leak: reject the whole envelope
    // (keep last-known-good) rather than drop the row and render the rest.
    if (hasCoordinates(raw)) return null;
    const visit = parsePublicVisit(raw);
    if (visit) visits.push(visit);
  }

  const payload: VisitFeedPayload = { visits, count: record.count };
  if (typeof record.hasMore === "boolean") payload.hasMore = record.hasMore;
  if ("nextCursor" in record) {
    payload.nextCursor = isValidCursor(record.nextCursor) ? record.nextCursor : null;
  }
  const markers = parseMarkers(record.markers);
  if (markers) payload.markers = markers;
  return payload;
}
