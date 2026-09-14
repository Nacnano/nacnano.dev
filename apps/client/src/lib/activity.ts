/**
 * Pure helpers behind the site-visit activity feed.
 *
 * Everything here is a total function over VisitEvent values with no Node,
 * Redis, or DOM access, so the same code runs on the server during the build,
 * in the browser, and under `bun test`. The route handlers and the client both
 * borrow from here rather than reinventing the ordering, aggregation, or
 * globe-marker rules.
 */

import type { VisitEvent, VisitFeedPayload, VisitMarker } from "./activityTypes";

/** Newest first. A stable sort keeps authored order inside one second. */
export function sortVisitsDesc(visits: readonly VisitEvent[]): VisitEvent[] {
  return [...visits].sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());
}

/**
 * Newest-first union of two visit sets, de-duplicated by `id` — the existing
 * entry wins, so a poll that re-reports an already-shown visit never duplicates
 * the row (and a page the reader scrolled to is never reordered underneath
 * them). Shared by the live poll and the infinite-scroll pager in the feed.
 */
export function mergeById(
  existing: readonly VisitEvent[],
  incoming: readonly VisitEvent[]
): VisitEvent[] {
  const map = new Map(existing.map((visit) => [visit.id, visit]));
  for (const visit of incoming) {
    if (!map.has(visit.id)) map.set(visit.id, visit);
  }
  return sortVisitsDesc(Array.from(map.values()));
}

/** The calendar day (UTC) a visit belongs to, as `YYYY-MM-DD`. */
export function dayKey(ts: string): string {
  return ts.slice(0, 10);
}

export type VisitDay = {
  day: string;
  visits: VisitEvent[];
};

/**
 * Bucket a newest-first list into days, newest day first, preserving the
 * within-day order it was given. Days are compared, not parsed back to Dates,
 * so a malformed timestamp can never silently reorder the feed.
 */
export function groupByDay(visits: readonly VisitEvent[]): VisitDay[] {
  const ordered = sortVisitsDesc(visits);
  const days: VisitDay[] = [];
  for (const visit of ordered) {
    const key = dayKey(visit.ts);
    const last = days[days.length - 1];
    if (last && last.day === key) last.visits.push(visit);
    else days.push({ day: key, visits: [visit] });
  }
  return days;
}

const MS_PER_DAY = 86_400_000;

function startOfUtcDay(ts: string): number {
  return new Date(`${dayKey(ts)}T00:00:00Z`).getTime();
}

/**
 * Whole calendar days between the tracked-since epoch and now, inclusive. Used
 * for the "over N days" framing next to the running total.
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

function locationKey(lat: number, lng: number): string {
  return `${lat.toFixed(2)},${lng.toFixed(2)}`;
}

/**
 * Points for the globe: every visit that carries a coordinate, merged by
 * location so one city viewed many times is a single marker scaled by how
 * many visits landed there. Size is clamped into cobe's comfortable range.
 */
export function visitMarkers(visits: readonly VisitEvent[]): VisitMarker[] {
  const buckets = new Map<string, { lat: number; lng: number; n: number }>();
  for (const visit of visits) {
    if (typeof visit.lat !== "number" || typeof visit.lng !== "number") continue;
    const key = locationKey(visit.lat, visit.lng);
    const found = buckets.get(key);
    if (found) found.n += 1;
    else buckets.set(key, { lat: visit.lat, lng: visit.lng, n: 1 });
  }
  return Array.from(buckets.values()).map((bucket) => ({
    location: [bucket.lat, bucket.lng] as [number, number],
    size: Math.min(0.35, 0.08 + bucket.n * 0.03),
  }));
}

export type CountryAggregate = {
  countryCode: string;
  city?: string;
  lat?: number;
  lng?: number;
  count: number;
};

/**
 * Roll visits up by country, newest-touched first by count. A country with no
 * code is skipped (nothing to aggregate); the first city and coordinate seen
 * for a country are kept as its representative point.
 */
export function aggregateByCountry(visits: readonly VisitEvent[]): CountryAggregate[] {
  const buckets = new Map<string, CountryAggregate>();
  for (const visit of visits) {
    const code = visit.countryCode?.trim().toUpperCase();
    if (!code) continue;
    const existing = buckets.get(code);
    if (existing) {
      existing.count += 1;
      if (!existing.city && visit.city) existing.city = visit.city;
      if (existing.lat === undefined && typeof visit.lat === "number") {
        existing.lat = visit.lat;
        existing.lng = visit.lng;
      }
    } else {
      buckets.set(code, {
        countryCode: code,
        city: visit.city,
        lat: visit.lat,
        lng: visit.lng,
        count: 1,
      });
    }
  }
  return Array.from(buckets.values()).sort((a, b) => b.count - a.count);
}

export type PageAggregate = {
  page: string;
  title?: string;
  count: number;
};

/** Most-viewed pages first, ties broken by the title it first appeared with. */
export function topPages(visits: readonly VisitEvent[]): PageAggregate[] {
  const buckets = new Map<string, PageAggregate>();
  for (const visit of visits) {
    const existing = buckets.get(visit.page);
    if (existing) {
      existing.count += 1;
      if (!existing.title && visit.title) existing.title = visit.title;
    } else {
      buckets.set(visit.page, { page: visit.page, title: visit.title, count: 1 });
    }
  }
  return Array.from(buckets.values()).sort((a, b) => b.count - a.count);
}

/** Distinct countries present in a set of visits. */
export function countCountries(visits: readonly VisitEvent[]): number {
  const codes = new Set<string>();
  for (const visit of visits) {
    const code = visit.countryCode?.trim().toUpperCase();
    if (code) codes.add(code);
  }
  return codes.size;
}

/** The public feed body: newest-first visits plus the running total. */
export function buildFeedPayload(
  visits: readonly VisitEvent[],
  count: number
): VisitFeedPayload {
  return { visits: sortVisitsDesc(visits), count };
}

/**
 * Live mode is on only when the site has been pointed at a Redis instance.
 * The page computes this on the server and hands the answer to the client as a
 * plain boolean, so no server-only env ever reaches the browser bundle. When
 * this is false nothing is polled or recorded and the page stays a genuinely
 * static site.
 */
export function isActivityLive(): boolean {
  // Truthiness, not `!== undefined`: an env var set to the empty string is the
  // classic CI/Vercel misconfiguration, and `getActivityClient` treats `""` as
  // absent. Both must agree, or a blank credential reads as "live" here while
  // the client returns null.
  return !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN;
}

/**
 * Is this a safe, *internal* page path? The visit beacon is an unauthenticated
 * write, and the feed renders `page` as a link — so a stored value like
 * `https://evil.example` or `//evil.example` would become an outbound link on
 * the public page. Only accept an absolute, same-site path built from the
 * characters our routes actually use: a single leading slash, then slug-ish
 * segments. This rejects protocol-relative (`//host`), scheme (`javascript:`),
 * backslash, whitespace, and traversal before anything is stored.
 */
export function isInternalPath(value: unknown): value is string {
  if (typeof value !== "string") return false;
  if (!value.startsWith("/")) return false;
  if (value.startsWith("//") || value.startsWith("/\\")) return false;
  if (value.includes("..")) return false;
  return /^\/[A-Za-z0-9\-._~]*(?:\/[A-Za-z0-9\-._~]*)*$/.test(value);
}

/**
 * The sample seed is a local-dev convenience only. On any Vercel deployment —
 * preview or production — the feed must show real visits or an honest empty
 * state, never fabricated traffic. `VERCEL` is set on every Vercel build, so
 * this is false there and the seed is suppressed; locally it is true.
 */
export function shouldUseSeed(): boolean {
  return process.env.VERCEL === undefined;
}
