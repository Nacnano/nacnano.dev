/**
 * The shared shape of the activity feed.
 *
 * This module is deliberately free of Node and Redis imports so it can be
 * pulled into client components, the route handlers, and the unit tests
 * without dragging server-only code across the bundle boundary.
 */

// The day the counter starts from. Shown once in the feed header so a reader
// knows how far back the numbers go.
export const ACTIVITY_TRACKED_SINCE = "2024-08-16";

export type ActivityKind =
  | "visit"
  | "like"
  | "read"
  | "listen"
  | "published"
  | "starred"
  | "shipped"
  | "coffee";

export type ActivityEvent = {
  id: string;
  /** ISO-8601 timestamp of when the thing happened. */
  ts: string;
  kind: ActivityKind;
  /** A short human sentence, e.g. "visited Writing from Bangkok". */
  summary: string;
  href?: string;
  /** Where the event came from, e.g. "GitHub" or "Bluesky". */
  source?: string;
  /** ISO 3166-1 alpha-2 code, set for visits so the feed can flag them. */
  countryCode?: string;
  city?: string;
  /** Set for events that should light up a point on the globe. */
  lat?: number;
  lng?: number;
};

export type ActivityFeedPayload = {
  events: ActivityEvent[];
  count: number;
};

export type ActivityMarker = {
  location: [number, number];
  size: number;
};

export const ACTIVITY_KIND_LABELS: Record<ActivityKind, string> = {
  visit: "Visit",
  like: "Like",
  read: "Read",
  listen: "Listen",
  published: "Writing",
  starred: "Star",
  shipped: "Release",
  coffee: "Coffee",
};

/** Runtime guard for anything arriving over the network (poll response). */
export function isActivityFeedPayload(value: unknown): value is ActivityFeedPayload {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    Array.isArray(record.events) &&
    typeof record.count === "number" &&
    Number.isFinite(record.count)
  );
}
