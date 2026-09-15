/**
 * Per-client rate limiting for the site's unauthenticated writes.
 *
 * Recording a visit is an unauthenticated write that fans out to Upstash, so
 * without a ceiling one script could inflate the counter and burn the instance's
 * request quota. The limiter rides the same Upstash client as the feed; when no
 * client is configured (static mode) there is nothing to protect, so requests
 * are allowed through untouched.
 *
 * The /ama ask box is the other write, and it is a different shape: a human
 * types it, so its ceiling is measured in questions per hour rather than beacons
 * per minute. It gets its own window and prefix rather than sharing the
 * beacon's.
 */

import { Ratelimit } from "@upstash/ratelimit";
import { getActivityClientOrNull } from "./activityRedis";
import { captureError } from "./observability";
import { getRuntimeConfig, namespacedKey } from "./runtimeConfig";

const WINDOW = "60 s";
const WINDOW_SECONDS = 60;
const LIMIT_PER_WINDOW = 60;
// Reads are polled every couple seconds per open tab and shared by everyone
// behind one carrier-NAT IP, so the read ceiling is far looser than the write
// one — it exists to stop unthrottled `?limit=100` hammering, not honest polling.
const READ_LIMIT_PER_WINDOW = 300;

// The ask box writes free text a human typed, into an inbox a human reads. A
// handful an hour per bucket is generous for an honest asker and useless to
// anyone trying to fill the stream; the sliding window means a burst of five
// does not then unlock five more a second later.
const ASK_WINDOW = "1 h";
const ASK_WINDOW_SECONDS = 60 * 60;
const ASK_LIMIT_PER_WINDOW = 5;

/** Shared with the route so the advertised `Retry-After` can never drift. */
export const RETRY_AFTER_SECONDS = WINDOW_SECONDS;
/** Same contract for the ask box, which throttles over a much longer window. */
export const ASK_RETRY_AFTER_SECONDS = ASK_WINDOW_SECONDS;

let limiter: Ratelimit | null | undefined;
let readLimiter: Ratelimit | null | undefined;
let askLimiter: Ratelimit | null | undefined;

function buildLimiter(
  prefix: string,
  limit: number,
  window: Parameters<typeof Ratelimit.slidingWindow>[1] = WINDOW
): Ratelimit | null {
  // Not `getActivityClient()`: a RedisConfigError raised here would escape
  // `throttle`'s try and 500 the very request the limiter exists to protect.
  // Reported by the resolver, then null — which is the fail-open path.
  const client = getActivityClientOrNull(`rate-limit:${prefix}`);
  if (!client) return null;
  return new Ratelimit({
    redis: client,
    limiter: Ratelimit.slidingWindow(limit, window),
    prefix: namespacedKey(prefix),
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

function getAskLimiter(): Ratelimit | null {
  if (askLimiter === undefined)
    askLimiter = buildLimiter("ama:ask-rl", ASK_LIMIT_PER_WINDOW, ASK_WINDOW);
  return askLimiter;
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

/**
 * Salted SHA-256 of the IP — a good limit bucket that leaks no raw address.
 *
 * The salt comes only from the validated server runtime configuration; the old
 * `"nacnano.dev"` fallback is gone because a public, predictable salt let an
 * attacker precompute a victim's bucket key. `getRuntimeConfig` has already
 * refused to return a configured result without a >=32-char salt, and it is
 * never reached in static mode (the limiter is null before this runs).
 */
async function limitKey(ip: string): Promise<string> {
  const config = getRuntimeConfig();
  const salt = config.mode === "configured" ? config.ipSalt : "";
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
  try {
    const rl = getLimiterFn();
    if (!rl) return true;
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

/**
 * Ceiling for the /ama ask box. Fails open for the same reason the others do —
 * an Upstash incident must not read to an asker as "your question was refused".
 * What stands behind it either way is the capped, expiring inbox stream: the
 * worst a flood past an outage can do is churn entries the author never reads.
 */
export async function allowAsk(ip: string): Promise<boolean> {
  return throttle(getAskLimiter, ip, "rate-limit-ask");
}
