import { resolveVisitTitle } from "@/lib/visitTitles";
import type { VisitFeedPayload } from "@/lib/activityTypes";

/**
 * Re-derive each visit's display label from content we control, keyed by the
 * already-validated `page`, at the moment the feed is served.
 *
 * The beacon resolves and stores a title on write, but that snapshot goes stale
 * whenever a page gains a registered title *after* its visits were stored (the
 * classic case: a route added to `PAGE_TITLES` later, so its older rows were
 * beaconed with no title and the feed fell back to the raw path). Resolving on
 * read means the public feed always reflects the current title map, and a stored
 * title is only used as a last resort for a path we can't resolve.
 *
 * Server-only: it reaches the MDX content loader via `resolveVisitTitle`, so it
 * must stay on the route/loader boundary, never the client.
 */
export function resolveFeedTitles(payload: VisitFeedPayload): VisitFeedPayload {
  return {
    ...payload,
    visits: payload.visits.map((visit) => {
      const title = resolveVisitTitle(visit.page) ?? visit.title;
      return title === visit.title ? visit : { ...visit, title };
    }),
  };
}
