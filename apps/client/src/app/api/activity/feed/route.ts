import { NextResponse } from "next/server";
import { buildFeedPayload, isActivityLive, shouldUseSeed } from "@/lib/activity";
import { readActivityFeed, STREAM_MAXLEN } from "@/lib/activityRedis";
import { resolveFeedTitles } from "@/lib/activityTitles";
import { allowFeed, clientIp, RETRY_AFTER_SECONDS } from "@/lib/rateLimit";
import { captureError } from "@/lib/observability";
import { seedVisits } from "@/data/activityData";

// The feed reflects recent visits, so it is never baked into the static build;
// the client polls this route while a tab is open, and pages older ones with a
// cursor as the reader scrolls.
export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 100;

// The client already tolerates ~2.5s of staleness by design, so a short edge
// cache absorbs the per-tab poll storm (and any unauthenticated hammering)
// without showing anything visibly staler than the feed intends to be.
const FEED_CACHE = "public, s-maxage=2, stale-while-revalidate=10";

/**
 * Resolve the requested page size to a value in the inclusive `1..100` window.
 *
 * The raw query value is inspected *before* numeric conversion. `Number(null)`
 * is `0` and `0` is finite, so the previous one-liner turned an omitted `limit`
 * into `0` and then clamped the whole first page down to a single row — a
 * no-query request returned 1 result while the client (which sends
 * `limit=30`) saw 30. A missing, blank, or non-numeric value now falls back to
 * `DEFAULT_LIMIT`; a finite number is truncated then clamped into range.
 */
export function parseLimit(raw: string | null): number {
  if (raw === null || raw.trim() === "") return DEFAULT_LIMIT;
  const value = Number(raw);
  if (!Number.isFinite(value)) return DEFAULT_LIMIT;
  return Math.min(MAX_LIMIT, Math.max(1, Math.trunc(value)));
}

function readPageParams(request: Request) {
  const params = new URL(request.url).searchParams;
  const limit = parseLimit(params.get("limit"));
  // A missing `before` is the head page (no cursor), not the string "null".
  const before = params.get("before") ?? null;
  // `all=1` asks for the entire retained history in one page (the stream holds
  // at most STREAM_MAXLEN rows), for the globe and the aggregate leaderboards.
  const all = params.get("all") === "1";
  return { limit, before, all };
}

export async function GET(request: Request) {
  const { limit, before, all } = readPageParams(request);

  if (isActivityLive()) {
    try {
      // The read path costs two Upstash ops per call and had no ceiling; a public
      // `?limit=100` flood is the larger quota bill. Same salted-key limiter as
      // the write, with a far looser window so honest polling never trips it.
      //
      // Inside the try, not above it: resolving the limiter reaches the runtime
      // configuration, and a configuration error there must land on the 503 path
      // below — the one that tells the client to keep its last good page —
      // rather than escaping as an unhandled 500.
      if (!(await allowFeed(clientIp(request.headers)))) {
        return NextResponse.json(
          { ok: false, error: "rate_limited" },
          {
            status: 429,
            headers: {
              "Retry-After": String(RETRY_AFTER_SECONDS),
              "Cache-Control": "no-store",
            },
          }
        );
      }
      // Whatever the store actually holds for this page, including an honest
      // empty result. Never substitute the seed on a real deployment. With
      // `all`, pull the whole retained window at once instead of a single page.
      const payload = await readActivityFeed(
        all ? STREAM_MAXLEN : limit,
        all ? null : before
      );
      return NextResponse.json(resolveFeedTitles(payload), {
        headers: { "Cache-Control": FEED_CACHE },
      });
    } catch (error) {
      // A store failure is not an empty feed. Surface it as 5xx so the client
      // keeps its last good page rather than rendering a fabricated zero, and
      // log it so an outage is visible to the operator.
      captureError(error, { scope: "activity/feed" });
      return NextResponse.json(
        { ok: false, error: "upstream_unavailable" },
        // Never cache an outage: the next request should retry the store.
        { status: 503, headers: { "Cache-Control": "no-store" } }
      );
    }
  }

  // No store configured. The sample seed is a single, unpaginated page and a
  // local-dev aid only; on Vercel we show the empty state instead. Both are
  // fixed until the next deploy, so they edge-cache far longer than live data.
  const staticHeaders = {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
  };
  if (shouldUseSeed()) {
    return NextResponse.json(
      resolveFeedTitles({
        ...buildFeedPayload(seedVisits, seedVisits.length),
        hasMore: false,
        nextCursor: null,
      }),
      staticHeaders
    );
  }
  return NextResponse.json(
    { visits: [], count: 0, hasMore: false, nextCursor: null },
    staticHeaders
  );
}
