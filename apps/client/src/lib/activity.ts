/**
 * Pure helpers behind the activity feed.
 *
 * Everything here is a total function over ActivityEvent values with no
 * Node, Redis, or DOM access, so the same code runs on the server during the
 * build, in the browser, and under `bun test`. The route handlers and the
 * client both borrow from here rather than reinventing the ordering, grouping,
 * or globe-marker rules — three places those were once wrong on their own.
 */

import {
  ACTIVITY_TRACKED_SINCE,
  type ActivityEvent,
  type ActivityFeedPayload,
  type ActivityMarker,
} from "./activityTypes";

/** Newest first. A stable sort keeps authored order inside one second. */
export function sortEventsDesc(events: readonly ActivityEvent[]): ActivityEvent[] {
  return [...events].sort(
    (a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime()
  );
}

/** The calendar day (UTC) an event belongs to, as `YYYY-MM-DD`. */
export function dayKey(ts: string): string {
  return ts.slice(0, 10);
}

export type ActivityDay = {
  day: string;
  events: ActivityEvent[];
};

/**
 * Bucket a newest-first list into days, newest day first, preserving the
 * within-day order it was given. Days are compared, not parsed back to Dates,
 * so a malformed timestamp can never silently reorder the feed.
 */
export function groupByDay(
  events: readonly ActivityEvent[]
): ActivityDay[] {
  const ordered = sortEventsDesc(events);
  const days: ActivityDay[] = [];
  for (const event of ordered) {
    const key = dayKey(event.ts);
    const last = days[days.length - 1];
    if (last && last.day === key) last.events.push(event);
    else days.push({ day: key, events: [event] });
  }
  return days;
}

const MS_PER_DAY = 86_400_000;

function startOfUtcDay(ts: string): number {
  return new Date(`${dayKey(ts)}T00:00:00Z`).getTime();
}

/**
 * Whole calendar days between the tracked-since epoch and now, inclusive. Used
 * for the "over N days" framing next to the running count.
 */
export function trackedDays(ts: string, now: string): number {
  const diff = startOfUtcDay(now) - startOfUtcDay(ts);
  return Math.max(1, Math.floor(diff / MS_PER_DAY) + 1);
}

/**
 * Compact relative time for a live row ("just now", "5m", "3h", "2d"), falling
 * back to an absolute day label past a week. `now` is passed in rather than
 * read from the clock so it is testable and so the caller controls the
 * ticking — the client only renders these after mount, never during the
 * server pass, to keep hydration free of a clock race.
 */
export function formatRelative(ts: string, now: number): string {
  const then = new Date(ts).getTime();
  if (!Number.isFinite(then)) return "";
  const seconds = Math.floor((now - then) / 1000);
  if (seconds < 45) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86_400) return `${Math.floor(seconds / 3600)}h`;
  const days = Math.floor(seconds / 86_400);
  if (days < 7) return `${days}d`;
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const FLAG_BASE = 0x1f1e6;
const REGIONAL_OFFSET = 0x41;

/** ISO-2 country code to its flag emoji, or empty for anything unparseable. */
export function countryFlag(code?: string): string {
  if (!code) return "";
  const normalized = code.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(normalized)) return "";
  const a = normalized.charAt(0);
  const b = normalized.charAt(1);
  return String.fromCodePoint(
    FLAG_BASE + (a.charCodeAt(0) - REGIONAL_OFFSET),
    FLAG_BASE + (b.charCodeAt(0) - REGIONAL_OFFSET)
  );
}

/**
 * Points for the globe: every event that carries a coordinate, de-duplicated
 * by location so a city visited many times is one marker scaled by how many
 * events landed there. Size is clamped into cobe's comfortable range.
 */
export function activityMarkers(
  events: readonly ActivityEvent[]
): ActivityMarker[] {
  const buckets = new Map<string, { lat: number; lng: number; n: number }>();
  for (const event of events) {
    if (typeof event.lat !== "number" || typeof event.lng !== "number") continue;
    const key = `${event.lat.toFixed(2)},${event.lng.toFixed(2)}`;
    const found = buckets.get(key);
    if (found) found.n += 1;
    else buckets.set(key, { lat: event.lat, lng: event.lng, n: 1 });
  }
  return Array.from(buckets.values()).map((bucket) => ({
    location: [bucket.lat, bucket.lng] as [number, number],
    size: Math.min(0.9, 0.25 + bucket.n * 0.08),
  }));
}

/** The public feed body: newest-first events plus the running total. */
export function buildFeedPayload(
  events: readonly ActivityEvent[],
  count: number
): ActivityFeedPayload {
  return { events: sortEventsDesc(events), count };
}

export { ACTIVITY_TRACKED_SINCE };

/**
 * Live mode is on only when the site has been pointed at a Redis instance.
 * The page computes this on the server and hands the answer to the client as a
 * plain boolean, so no server-only env ever reaches the browser bundle. When
 * this is false every surface falls back to the static seed and the page stays
 * a genuinely static site.
 */
export function isActivityLive(): boolean {
  return (
    process.env.UPSTASH_REDIS_REST_URL !== undefined &&
    process.env.UPSTASH_REDIS_REST_TOKEN !== undefined
  );
}
