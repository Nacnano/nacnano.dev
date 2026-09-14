import { NextResponse } from "next/server";
import {
  buildFeedPayload,
  isActivityLive,
  shouldUseSeed,
} from "@/lib/activity";
import { readActivityFeed } from "@/lib/activityRedis";
import { seedVisits } from "@/data/activityData";

// The feed reflects recent visits, so it is never baked into the static build;
// the client polls this route while a tab is open, and pages older ones with a
// cursor as the reader scrolls.
export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 100;

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
    try {
      // Whatever the store actually holds for this page, including an honest
      // empty result. Never substitute the seed on a real deployment.
      const payload = await readActivityFeed(limit, before);
      return NextResponse.json(payload);
    } catch {
      return NextResponse.json({ visits: [], count: 0, hasMore: false, nextCursor: null });
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
