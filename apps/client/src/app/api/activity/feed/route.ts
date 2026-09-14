import { NextResponse } from "next/server";
import {
  buildFeedPayload,
  isActivityLive,
  shouldUseSeed,
} from "@/lib/activity";
import { readActivityFeed } from "@/lib/activityRedis";
import { seedVisits } from "@/data/activityData";

// The feed reflects recent visits, so it is never baked into the static build;
// the client polls this route while a tab is open.
export const dynamic = "force-dynamic";

export async function GET() {
  if (isActivityLive()) {
    try {
      // Return whatever the store actually holds, including an honest empty
      // result. Never substitute the seed here: on a real deployment a blank
      // globe is the truth, not a bug to paper over.
      const payload = await readActivityFeed();
      return NextResponse.json(payload);
    } catch {
      return NextResponse.json({ visits: [], count: 0 });
    }
  }

  // No store configured. Sample data is a local-dev aid only; on Vercel (where
  // there is simply no Redis wired up yet) show the empty state instead.
  if (shouldUseSeed()) {
    return NextResponse.json(buildFeedPayload(seedVisits, seedVisits.length));
  }
  return NextResponse.json({ visits: [], count: 0 });
}
