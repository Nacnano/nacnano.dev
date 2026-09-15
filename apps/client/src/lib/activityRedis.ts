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
import { isInternalPath, sortVisitsDesc } from "./activity";
import { parseVisitEvent } from "./activityTypes";
import { captureError } from "./observability";
import { getRuntimeConfig, namespacedKey } from "./runtimeConfig";
import type { VisitEvent, VisitFeedPayload } from "./activityTypes";

// Logical keys; the configured namespace (see `runtimeConfig.namespacedKey`) is
// applied at each use so an opted-in prefix isolates test workspaces without
// changing production keys when no prefix is set.
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

let cachedClient: Redis | undefined;

/**
 * The configured Upstash client, or null in a genuinely static deployment.
 *
 * Construction goes through the validated runtime configuration: neither
 * credential present is the supported static mode (returns null), but a partial
 * or weak live configuration *throws* rather than silently degrading — the
 * caller's try/catch turns it into a 5xx the operator can actually see, which is
 * the point. Only a constructed client is cached, so a store configured later (a
 * different runtime, or a test) is picked up rather than latched off forever.
 */
export function getActivityClient(): Redis | null {
  if (cachedClient) return cachedClient;
  const config = getRuntimeConfig();
  if (config.mode === "disabled") return null;
  cachedClient ??= new Redis({ url: config.url, token: config.token });
  return cachedClient;
}

export function coerceVisit(raw: unknown): VisitEvent | null {
  return parseVisitEvent(raw);
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
      }
      // Anything else is a shape with no id we can use — skipped rather than
      // guessed at, so a client or runtime change cannot invent a cursor.
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

  const streamKey = namespacedKey(STREAM_KEY);
  const countKey = namespacedKey(COUNT_KEY);
  const cursor = normaliseCursor(before);
  // `(<id>` is an exclusive upper bound, so the page starts strictly older than
  // the cursor the client already has.
  const upper = cursor ? `(${cursor}` : "+";

  const [entries, count] = await Promise.all([
    client.xrevrange(streamKey, upper, "-", limit),
    client.get<number>(countKey),
  ]);

  const parsed = parseStreamEntries(entries);

  const visits: VisitEvent[] = [];
  for (const entry of parsed) {
    const visit = coerceVisit(entry.fields.data);
    if (!visit) {
      // A row we can't parse must never truncate or loop pagination (the paging
      // decision below uses the RAW page), but it is worth surfacing so a store
      // corruption or a schema drift is visible rather than silently missing.
      captureError(new Error("corrupt activity row skipped"), {
        scope: "activity-feed",
        entryId: entry.id,
      });
      continue;
    }
    // The write endpoint enforces the path, but the feed renders `page` as a
    // link — so re-check on read too, or any row written before the guard (or
    // through a path that bypasses it) keeps rendering as an outbound link.
    // Dropping the row here means the guarantee holds for data we didn't write.
    if (isInternalPath(visit.page)) visits.push({ ...visit, cursor: entry.id });
  }

  const ordered = sortVisitsDesc(visits);
  return {
    visits: ordered,
    count: count ?? ordered.length,
    // Paging is decided by the RAW page Redis returned, not the filtered one —
    // otherwise a single dropped row makes a full page look short, ends the walk
    // early, and strands all older history (a durable denial worse than the
    // injection this filter exists to stop). A full raw page ⇒ older entries
    // likely remain; the cursor is the oldest RAW id, so the next page never
    // re-reads rows we already discarded.
    hasMore: parsed.length === limit,
    nextCursor: parsed.at(-1)?.id ?? null,
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

function normalizedCountry(value: string | undefined): string | undefined {
  if (typeof value !== "string") return undefined;
  const code = value.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(code) ? code : undefined;
}

/** Coords are stored as a pair, in range, or not at all — never a lone axis. */
function coordinatePair(
  lat: number | undefined,
  lng: number | undefined
): { lat?: number; lng?: number } {
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
    return { lat: coarsenCoordinate(lat), lng: coarsenCoordinate(lng) };
  }
  return {};
}

export function visitEvent(input: VisitInput): VisitEvent {
  const coords = coordinatePair(input.lat, input.lng);
  return {
    id: crypto.randomUUID(),
    ts: new Date().toISOString(),
    page: input.path,
    title: input.title?.trim() || undefined,
    countryCode: normalizedCountry(input.countryCode),
    city: input.city?.trim() || undefined,
    lat: coords.lat,
    lng: coords.lng,
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
  const streamKey = namespacedKey(STREAM_KEY);
  const countKey = namespacedKey(COUNT_KEY);

  const pipeline = client.pipeline();
  pipeline.xadd(
    streamKey,
    "*",
    { data: JSON.stringify(event) },
    {
      trim: { type: "MAXLEN", comparison: "~", threshold: STREAM_MAXLEN },
    }
  );
  pipeline.incr(countKey);
  // Drop entries older than the retention window (stream ids are ms-ordered).
  pipeline.xtrim(streamKey, {
    strategy: "MINID",
    exactness: "~",
    threshold: oldestAllowed,
  });
  // Idle clear: if tracking stops entirely, the keys vanish after the window.
  pipeline.expire(streamKey, RETENTION_SECONDS);
  pipeline.expire(countKey, RETENTION_SECONDS);
  await pipeline.exec();

  return true;
}
