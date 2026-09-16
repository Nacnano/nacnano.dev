/**
 * Server-side initial feed load for the /activity route.
 *
 * Split out of the page so the store-failure contract lives in one testable
 * place: a live read that throws is reported and surfaced as an error, NOT
 * silently turned into a confident "0 visits". The client poller keeps whatever
 * it last had; this decides only the first paint.
 */

import { buildFeedPayload, shouldUseSeed } from "./activity";
import { readActivityFeed, STREAM_MAXLEN } from "./activityRedis";
import { resolveFeedTitles } from "./activityTitles";
import { seedVisits } from "@/data/activityData";
import { captureError } from "./observability";
import type { VisitFeedPayload } from "./activityTypes";

export type InitialFeed =
  { status: "ok"; payload: VisitFeedPayload } | { status: "error" };

export async function loadInitialFeed(live: boolean): Promise<InitialFeed> {
  if (live) {
    try {
      // The WHOLE retained window in one read, not a head page.
      //
      // The globe, the country badges, the "Most visited" board and the
      // "Countries" stat all summarise every row we hold, so a head page is the
      // wrong input for them: rendering it first and widening later showed a
      // confidently wrong number (one country, then six) for as long as the
      // second request took. The stream is capped at STREAM_MAXLEN, so "all" is
      // a bounded single read — one round trip feeds the entire page, and the
      // client never has to fetch again to be correct.
      //
      // Titles are re-derived from our own content so rows stored before a page
      // gained a registered title still read correctly.
      const payload = await readActivityFeed(STREAM_MAXLEN);
      return {
        status: "ok",
        payload: resolveFeedTitles({
          ...payload,
          // This IS everything retained: a full page here means the stream is at
          // its cap, not that older rows are waiting — they were trimmed. The
          // client pages the recent list from this array, never over the wire.
          hasMore: false,
          nextCursor: null,
        }),
      };
    } catch (error) {
      captureError(error, { scope: "activity-initial-feed" });
      return { status: "error" };
    }
  }

  // Store-less local dev shows the sample; a deploy without Redis shows empty.
  if (shouldUseSeed()) {
    return {
      status: "ok",
      payload: resolveFeedTitles({
        ...buildFeedPayload(seedVisits, seedVisits.length),
        hasMore: false,
        nextCursor: null,
      }),
    };
  }
  return {
    status: "ok",
    payload: { visits: [], count: 0, hasMore: false, nextCursor: null },
  };
}
