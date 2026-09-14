/**
 * Server-side initial feed load for the /activity route.
 *
 * Split out of the page so the store-failure contract lives in one testable
 * place: a live read that throws is reported and surfaced as an error, NOT
 * silently turned into a confident "0 visits". The client poller keeps whatever
 * it last had; this decides only the first paint.
 */

import { buildFeedPayload, shouldUseSeed } from "./activity";
import { readActivityFeed } from "./activityRedis";
import { seedVisits } from "@/data/activityData";
import { captureError } from "./observability";
import type { VisitFeedPayload } from "./activityTypes";

// One page up front; the client pages older ones. Keep in sync with the route.
export const HEAD_LIMIT = 30;

export type InitialFeed =
  | { status: "ok"; payload: VisitFeedPayload }
  | { status: "error" };

export async function loadInitialFeed(live: boolean): Promise<InitialFeed> {
  if (live) {
    try {
      // Whatever the store holds — including an honest empty page.
      return { status: "ok", payload: await readActivityFeed(HEAD_LIMIT) };
    } catch (error) {
      captureError(error, { scope: "activity-initial-feed" });
      return { status: "error" };
    }
  }

  // Store-less local dev shows the sample; a deploy without Redis shows empty.
  if (shouldUseSeed()) {
    return {
      status: "ok",
      payload: {
        ...buildFeedPayload(seedVisits, seedVisits.length),
        hasMore: false,
        nextCursor: null,
      },
    };
  }
  return { status: "ok", payload: { visits: [], count: 0, hasMore: false, nextCursor: null } };
}