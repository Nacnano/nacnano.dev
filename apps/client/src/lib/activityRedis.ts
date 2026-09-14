/**
 * The Redis-backed store behind the live site-visit feed.
 *
 * This is the only module that talks to Upstash, and the whole of it is behind
 * an env gate: with no credentials configured the client is never constructed,
 * the route handlers read the static seed instead, and a visit is dropped
 * rather than stored. That keeps the site a plain static deploy until someone
 * points it at a real instance.
 *
 * The store is a capped Redis stream plus a counter. Visits are written as
 * JSON; the newest `MAXLEN` are what the public feed reads back.
 */

import { Redis } from "@upstash/redis";
import { buildFeedPayload, sortVisitsDesc } from "./activity";
import type { VisitEvent, VisitFeedPayload } from "./activityTypes";

const STREAM_KEY = "activity:stream";
const COUNT_KEY = "activity:count";
const STREAM_MAXLEN = 1500;

export type VisitInput = {
  path: string;
  title?: string;
  countryCode?: string;
  city?: string;
  lat?: number;
  lng?: number;
};

let cachedClient: Redis | null | undefined;

/** The configured Upstash client, or null when the app runs in static mode. */
export function getActivityClient(): Redis | null {
  if (cachedClient !== undefined) return cachedClient;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    cachedClient = null;
    return cachedClient;
  }
  cachedClient = new Redis({ url, token });
  return cachedClient;
}

function isVisitEvent(value: unknown): value is VisitEvent {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    typeof record.ts === "string" &&
    typeof record.page === "string"
  );
}

/**
 * Pull the newest `limit` visits plus the running total.
 *
 * Upstash hands a stream back as id→field pairs, but the exact shape differs
 * between the REST deserializer (an object keyed by id) and the raw reply (an
 * array of [id, flat-fields]). Both are normalised here so a change in the
 * client library or runtime cannot silently blank the feed.
 */
export async function readActivityFeed(limit = 120): Promise<VisitFeedPayload> {
  const client = getActivityClient();
  if (!client) return buildFeedPayload([], 0);

  const [entries, count] = await Promise.all([
    client.xrevrange(STREAM_KEY, "+", "-", limit),
    client.get<number>(COUNT_KEY),
  ]);

  const visits: VisitEvent[] = [];
  for (const fields of normaliseEntries(entries)) {
    const raw = fields.data;
    if (typeof raw !== "string") continue;
    try {
      const parsed: unknown = JSON.parse(raw);
      if (isVisitEvent(parsed)) visits.push(parsed);
    } catch {
      // A malformed entry must not take the whole feed down.
    }
  }

  return buildFeedPayload(visits, count ?? visits.length);
}

function normaliseEntries(entries: unknown): Record<string, string>[] {
  const collected: Record<string, string>[] = [];
  if (Array.isArray(entries)) {
    // [id, [field, value, field, value, ...]] or already [id, { field: value }]
    for (const entry of entries) {
      const pair = Array.isArray(entry) ? entry[1] : entry;
      if (Array.isArray(pair)) {
        const record: Record<string, string> = {};
        for (let i = 0; i + 1 < pair.length; i += 2) {
          record[String(pair[i])] = String(pair[i + 1]);
        }
        collected.push(record);
      } else if (pair && typeof pair === "object") {
        collected.push(pair as Record<string, string>);
      }
    }
    return collected;
  }
  if (entries && typeof entries === "object") {
    for (const value of Object.values(entries as Record<string, unknown>)) {
      if (value && typeof value === "object") {
        collected.push(value as Record<string, string>);
      }
    }
  }
  return collected;
}

export function visitEvent(input: VisitInput): VisitEvent {
  return {
    id: crypto.randomUUID(),
    ts: new Date().toISOString(),
    page: input.path,
    title: input.title?.trim() || undefined,
    countryCode: input.countryCode,
    city: input.city?.trim() || undefined,
    lat: input.lat,
    lng: input.lng,
  };
}

/** Writes a visit to the stream. Returns false when running in static mode. */
export async function recordVisit(input: VisitInput): Promise<boolean> {
  const client = getActivityClient();
  if (!client) return false;

  const event = visitEvent(input);
  await client.xadd(STREAM_KEY, "*", { data: JSON.stringify(event) }, {
    trim: { type: "MAXLEN", comparison: "~", threshold: STREAM_MAXLEN },
  });
  await client.incr(COUNT_KEY);

  return true;
}

/** Merges live visits over the static seed, newest first, de-duplicated. */
export function mergeFeed(
  live: readonly VisitEvent[],
  seed: readonly VisitEvent[]
): VisitEvent[] {
  if (live.length === 0) return sortVisitsDesc(seed);
  const seen = new Set(live.map((event) => event.id));
  const fallback = seed.filter((event) => !seen.has(event.id));
  return sortVisitsDesc([...live, ...fallback]);
}
