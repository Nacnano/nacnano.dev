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
 * JSON; the newest `MAXLEN` are what the public feed reads back, and the stream
 * id doubles as the pagination cursor for the client's infinite scroll.
 */

import { Redis } from "@upstash/redis";
import { sortVisitsDesc } from "./activity";
import type { VisitEvent, VisitFeedPayload } from "./activityTypes";

const STREAM_KEY = "activity:stream";
const COUNT_KEY = "activity:count";
// How far back detailed visits reach, by count. Exported so the UI can state it
// without hardcoding a number that could drift from the store.
export const STREAM_MAXLEN = 1500;
// A true age ceiling, in addition to the count cap: entries older than this are
// pruned on every write (XTRIM MINID), and if tracking goes fully dormant the
// idle EXPIRE clears the keys entirely. Both bound retention; neither depends on
// the site staying live to keep the age limit honest.
const RETENTION_SECONDS = 180 * 24 * 60 * 60;
const RETENTION_MS = RETENTION_SECONDS * 1000;

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

export function coerceVisit(raw: unknown): VisitEvent | null {
  const candidate =
    typeof raw === "string"
      ? safeParse(raw)
      : raw;
  return isVisitEvent(candidate) ? candidate : null;
}

function safeParse(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

type StreamEntry = { id: string; fields: Record<string, unknown> };

/**
 * Normalise the newest→oldest stream reply into `{ id, fields }` pairs.
 *
 * Upstash's stream deserializer hands back an object keyed by entry id whose
 * values are field maps (and runs JSON.parse on each field value, so `data` is
 * normally an object). Older/raw replies are an array of `[id, [field, value]]`
 * tuples. Both shapes — plus a single unwrapped entry — are handled here so a
 * client or runtime change cannot silently blank the feed or drop the cursor.
 */
export function parseStreamEntries(entries: unknown): StreamEntry[] {
  const collected: StreamEntry[] = [];

  const recordFromFlat = (flat: unknown[]): Record<string, unknown> => {
    const record: Record<string, unknown> = {};
    for (let i = 0; i + 1 < flat.length; i += 2) {
      record[String(flat[i])] = flat[i + 1];
    }
    return record;
  };

  if (Array.isArray(entries)) {
    // A single unwrapped entry: [id, fields]
    if (
      entries.length === 2 &&
      typeof entries[0] === "string" &&
      Array.isArray(entries[1])
    ) {
      return [{ id: entries[0], fields: recordFromFlat(entries[1]) }];
    }
    // A list of entries, each [id, fields]
    for (const entry of entries) {
      if (Array.isArray(entry) && entry.length >= 2 && typeof entry[0] === "string") {
        collected.push({
          id: entry[0],
          fields: Array.isArray(entry[1])
            ? recordFromFlat(entry[1])
            : ((entry[1] as Record<string, unknown>) ?? {}),
        });
      } else if (entry && typeof entry === "object") {
        // Some shape without an id we can use; skip rather than guess.
        continue;
      }
    }
    return collected;
  }

  if (entries && typeof entries === "object") {
    for (const [id, value] of Object.entries(entries as Record<string, unknown>)) {
      if (value && typeof value === "object") {
        collected.push({ id, fields: value as Record<string, unknown> });
      }
    }
  }
  return collected;
}

/** A stream id looks like `<ms>-<seq>`; anything else is treated as absent. */
function normaliseCursor(before?: string | null): string | null {
  return before && /^\d+-\d+$/.test(before) ? before : null;
}

/**
 * Read one page of visits, newest first, oldest-last.
 *
 * @param limit  max rows to return (newest first)
 * @param before stream id to page older than (exclusive); omit for the head page
 */
export async function readActivityFeed(
  limit = 30,
  before?: string | null
): Promise<VisitFeedPayload> {
  const client = getActivityClient();
  if (!client) return { visits: [], count: 0, hasMore: false, nextCursor: null };

  const cursor = normaliseCursor(before);
  // `(<id>` is an exclusive upper bound, so the page starts strictly older than
  // the cursor the client already has.
  const upper = cursor ? `(${cursor}` : "+";

  const [entries, count] = await Promise.all([
    client.xrevrange(STREAM_KEY, upper, "-", limit),
    client.get<number>(COUNT_KEY),
  ]);

  const visits: VisitEvent[] = [];
  for (const entry of parseStreamEntries(entries)) {
    const visit = coerceVisit(entry.fields.data);
    if (visit) visits.push({ ...visit, cursor: entry.id });
  }

  const ordered = sortVisitsDesc(visits);
  return {
    visits: ordered,
    count: count ?? ordered.length,
    // A full page implies older entries likely remain; a short/empty page ends
    // the walk. The last (oldest) id is the cursor for the next older page.
    hasMore: ordered.length === limit,
    nextCursor: ordered.at(-1)?.cursor ?? null,
  };
}

/**
 * Round a coordinate to one decimal place (~11 km latitude; less for longitude
 * the further from the equator). The globe needs a city-level hint, not a
 * precise fix, so stored locations stay coarse by design.
 *
 * This applies to NEW writes only. Any full-precision entries already in the
 * stream roll off naturally via the MAXLEN/MINID trims; for an immediate purge
 * at deploy, run `DEL activity:stream` once.
 */
export function coarsenCoordinate(value: number | undefined): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  return Math.round(value * 10) / 10;
}

export function visitEvent(input: VisitInput): VisitEvent {
  return {
    id: crypto.randomUUID(),
    ts: new Date().toISOString(),
    page: input.path,
    title: input.title?.trim() || undefined,
    countryCode: input.countryCode,
    city: input.city?.trim() || undefined,
    lat: coarsenCoordinate(input.lat),
    lng: coarsenCoordinate(input.lng),
  };
}

/**
 * Writes a visit to the stream. Returns false when running in static mode.
 *
 * All store mutations ride one pipeline (a single round trip): append with a
 * count trim, bump the total, apply the age trim, and refresh the idle expiry.
 */
export async function recordVisit(input: VisitInput): Promise<boolean> {
  const client = getActivityClient();
  if (!client) return false;

  const event = visitEvent(input);
  const oldestAllowed = `${Date.now() - RETENTION_MS}-0`;

  const pipeline = client.pipeline();
  pipeline.xadd(STREAM_KEY, "*", { data: JSON.stringify(event) }, {
    trim: { type: "MAXLEN", comparison: "~", threshold: STREAM_MAXLEN },
  });
  pipeline.incr(COUNT_KEY);
  // Drop entries older than the retention window (stream ids are ms-ordered).
  pipeline.xtrim(STREAM_KEY, { strategy: "MINID", exactness: "~", threshold: oldestAllowed });
  // Idle clear: if tracking stops entirely, the keys vanish after the window.
  pipeline.expire(STREAM_KEY, RETENTION_SECONDS);
  pipeline.expire(COUNT_KEY, RETENTION_SECONDS);
  await pipeline.exec();

  return true;
}
