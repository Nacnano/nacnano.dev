/**
 * Per-client rate limiting for the visit beacon.
 *
 * Recording a visit is an unauthenticated write that fans out to Upstash, so
 * without a ceiling one script could inflate the counter and burn the instance's
 * request quota. The limiter rides the same Upstash client as the feed; when no
 * client is configured (static mode) there is nothing to protect, so requests
 * are allowed through untouched.
 */

import { Ratelimit } from "@upstash/ratelimit";
import { getActivityClient } from "./activityRedis";
import { captureError } from "./observability";

const WINDOW = "60 s";
const WINDOW_SECONDS = 60;
const LIMIT_PER_WINDOW = 60;
// Reads are polled every couple seconds per open tab and shared by everyone
// behind one carrier-NAT IP, so the read ceiling is far looser than the write
// one — it exists to stop unthrottled `?limit=100` hammering, not honest polling.
const READ_LIMIT_PER_WINDOW = 300;

/** Shared with the route so the advertised `Retry-After` can never drift. */
export const RETRY_AFTER_SECONDS = WINDOW_SECONDS;

let limiter: Ratelimit | null | undefined;
let readLimiter: Ratelimit | null | undefined;

function buildLimiter(prefix: string, limit: number): Ratelimit | null {
  const client = getActivityClient();
  if (!client) return null;
  return new Ratelimit({
    redis: client,
    limiter: Ratelimit.slidingWindow(limit, WINDOW),
    prefix,
    analytics: false,
    // In-process deny cache: an already-blocked key is rejected without a
    // round trip, so a flood does not double Upstash traffic on the hot path.
    ephemeralCache: new Map(),
  });
}

function getLimiter(): Ratelimit | null {
  if (limiter === undefined)
    limiter = buildLimiter("activity:visit-rl", LIMIT_PER_WINDOW);
  return limiter;
}

function getReadLimiter(): Ratelimit | null {
  if (readLimiter === undefined)
    readLimiter = buildLimiter("activity:feed-rl", READ_LIMIT_PER_WINDOW);
  return readLimiter;
}

/**
 * Best-effort client identity. On Vercel the platform rewrites `x-forwarded-for`,
 * so the first entry is trustworthy *there*; anywhere else a caller could spoof
 * it, so treat it as a bucket label only, never as proof of origin. Absent both
 * headers (local dev) everyone shares one bucket.
 *
 * The raw value never reaches Redis — `allowVisit` keys the limiter by a salted
 * digest instead, so a rate-limit row is not a stored IP.
 */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  return first || headers.get("x-real-ip") || "local";
}

/** Salted SHA-256 of the IP — a good limit bucket that leaks no raw address. */
async function limitKey(ip: string): Promise<string> {
  const salt = process.env.VISIT_IP_SALT ?? "nacnano.dev";
  const bytes = new TextEncoder().encode(`${ip}:${salt}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * True when the request may proceed; false when throttled. Fails OPEN: a limiter
 * outage is an Upstash incident, and it must never surface as a page error —
 * this is the first Upstash call on the beacon path, so a throw here would 500
 * before `recordVisit` ever got to handle its own failure.
 */
async function throttle(
  getLimiterFn: () => Ratelimit | null,
  ip: string,
  scope: string
): Promise<boolean> {
  const rl = getLimiterFn();
  if (!rl) return true;
  try {
    const { success } = await rl.limit(await limitKey(ip));
    return success;
  } catch (error) {
    captureError(error, { scope });
    return true;
  }
}

export async function allowVisit(ip: string): Promise<boolean> {
  return throttle(getLimiter, ip, "rate-limit");
}

/** Read-path ceiling for `GET /api/activity/feed`. Same fail-open contract. */
export async function allowFeed(ip: string): Promise<boolean> {
  return throttle(getReadLimiter, ip, "rate-limit-feed");
}
