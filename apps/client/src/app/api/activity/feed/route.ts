import { NextResponse } from "next/server";
import { buildFeedPayload, isActivityLive } from "@/lib/activity";
import { readActivityFeed } from "@/lib/activityRedis";
import { seedVisits } from "@/data/activityData";

// The feed reflects recent visits, so it is never baked into the static build;
// the client polls this route while a tab is open.
export const dynamic = "force-dynamic";

export async function GET() {
  if (!isActivityLive()) {
    return NextResponse.json(buildFeedPayload(seedVisits, seedVisits.length));
  }

  try {
    const payload = await readActivityFeed();
    // An empty live store (fresh instance, nothing recorded yet) still reads
    // better as the seed than as a blank page.
    if (payload.visits.length === 0) {
      return NextResponse.json(buildFeedPayload(seedVisits, seedVisits.length));
    }
    return NextResponse.json(payload);
  } catch {
    return NextResponse.json(buildFeedPayload(seedVisits, seedVisits.length));
  }
}
