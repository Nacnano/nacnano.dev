import { NextResponse } from "next/server";
import { buildFeedPayload, isActivityLive, shouldUseSeed } from "@/lib/activity";
import { readActivityFeed } from "@/lib/activityRedis";
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

function readPageParams(request: Request) {
  const params = new URL(request.url).searchParams;
  const rawLimit = Number(params.get("limit"));
  const limit = Number.isFinite(rawLimit)
    ? Math.min(MAX_LIMIT, Math.max(1, Math.trunc(rawLimit)))
    : DEFAULT_LIMIT;
  const before = params.get("before");
  return { limit, before };
}

export async function GET(request: Request) {
  const { limit, before } = readPageParams(request);

  if (isActivityLive()) {
    // The read path costs two Upstash ops per call and had no ceiling; a public
    // `?limit=100` flood is the larger quota bill. Same salted-key limiter as
    // the write, with a far looser window so honest polling never trips it.
    if (!(await allowFeed(clientIp(request.headers)))) {
      return NextResponse.json(
        { ok: false, error: "rate_limited" },
        { status: 429, headers: { "Retry-After": String(RETRY_AFTER_SECONDS) } }
      );
    }
    try {
      // Whatever the store actually holds for this page, including an honest
      // empty result. Never substitute the seed on a real deployment.
      const payload = await readActivityFeed(limit, before);
      return NextResponse.json(payload, { headers: { "Cache-Control": FEED_CACHE } });
    } catch (error) {
      // A store failure is not an empty feed. Surface it as 5xx so the client
      // keeps its last good page rather than rendering a fabricated zero, and
      // log it so an outage is visible to the operator.
      captureError(error, { route: "activity/feed" });
      return NextResponse.json(
        { ok: false, error: "upstream_unavailable" },
        // Never cache an outage: the next request should retry the store.
        { status: 503, headers: { "Cache-Control": "no-store" } }
      );
    }
  }

  // No store configured. The sample seed is a single, unpaginated page and a
  // local-dev aid only; on Vercel we show the empty state instead.
  if (shouldUseSeed()) {
    return NextResponse.json({
      ...buildFeedPayload(seedVisits, seedVisits.length),
      hasMore: false,
      nextCursor: null,
    });
  }
  return NextResponse.json({ visits: [], count: 0, hasMore: false, nextCursor: null });
}
