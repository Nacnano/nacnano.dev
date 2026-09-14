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
};

export type VisitFeedPayload = {
  visits: VisitEvent[];
  count: number;
};

export type VisitMarker = {
  location: [number, number];
  size: number;
};

/** Runtime guard for anything arriving over the network (poll response). */
export function isVisitFeedPayload(value: unknown): value is VisitFeedPayload {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    Array.isArray(record.visits) &&
    typeof record.count === "number" &&
    Number.isFinite(record.count)
  );
}
