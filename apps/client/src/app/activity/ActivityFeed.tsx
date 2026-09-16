"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import CustomLink from "@/components/Link";
import { useMounted } from "@/lib/useMounted";
import { useInView } from "@/lib/useInView";
import { formatDate } from "@/lib/formatDate";
import {
  aggregateByCountry,
  countCountries,
  formatRelative,
  mergeById,
  topPages,
  trackedDays,
  visitMarkers,
} from "@/lib/activity";
import {
  VISITS_TRACKED_SINCE,
  parseFeedPayload,
  type VisitEvent,
  type VisitFeedPayload,
} from "@/lib/activityTypes";

// One page size for both the live head and "show more" pages. Paused while
// the tab is hidden.
const PAGE_SIZE = 30;
const POLL_MS = 2500;
// The "Most visited" leaderboard pages client-side over the whole retained set
// rather than truncating to a fixed top-N.
const MOST_VISITED_PAGE = 6;

// The globe is a WebGL canvas that only ever draws on the client, so its cobe
// code is deferred; a sized placeholder keeps the sticky column from shifting.
// It is additionally gated behind an IntersectionObserver (see `useInView`), so
// the chunk isn't even requested until the globe nears the viewport — the win
// for below-the-fold mobile, while on desktop it is visible immediately and
// loads as before.
const ActivityGlobe = dynamic(() => import("./ActivityGlobe"), {
  ssr: false,
});

/** The reserved, sized box the globe draws into — present before and while the
 *  cobe chunk streams in, so mounting the canvas never shifts layout. */
function GlobeShell({ children }: { children?: React.ReactNode }) {
  return (
    <div className="aspect-square w-full" aria-busy={!children}>
      {children ?? (
        <div
          aria-hidden="true"
          className="h-full w-full rounded-full border border-zinc-200 dark:border-zinc-800"
        />
      )}
    </div>
  );
}

function locationLabel(visit: VisitEvent): string {
  return [visit.city, visit.countryCode].filter(Boolean).join(" · ") || "somewhere";
}

/** Fetch one page of the feed; a non-ok or malformed response is `null`. */
async function fetchPage(before: string | null): Promise<VisitFeedPayload | null> {
  const params = new URLSearchParams({ limit: String(PAGE_SIZE) });
  if (before) params.set("before", before);
  const response = await fetch(`/api/activity/feed?${params.toString()}`, {
    headers: { accept: "application/json" },
  });
  if (!response.ok) return null;
  const payload: unknown = await response.json();
  // Strict parse: an unusable envelope reads as `null` so the poll keeps the
  // last-known-good feed instead of replacing it with malformed rows.
  return parseFeedPayload(payload);
}

/**
 * Fetch the entire retained window in one shot, for the globe and the aggregate
 * leaderboards (which reflect every visit we hold, not just the page shown as
 * recent). A non-ok or malformed response is `null`, so callers keep what they
 * already have.
 */
async function fetchAllVisits(): Promise<VisitEvent[] | null> {
  const response = await fetch(`/api/activity/feed?all=1`, {
    headers: { accept: "application/json" },
  });
  if (!response.ok) return null;
  const payload: unknown = await response.json();
  const parsed = parseFeedPayload(payload);
  return parsed ? parsed.visits : null;
}

type Props = {
  initialVisits: VisitEvent[];
  initialCount: number;
  initialHasMore: boolean;
  initialCursor: string | null;
  live: boolean;
};

export default function ActivityFeed({
  initialVisits,
  initialCount,
  initialHasMore,
  initialCursor,
  live,
}: Props) {
  const [visits, setVisits] = useState<VisitEvent[]>(initialVisits);
  const [count, setCount] = useState<number>(initialCount);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [hasMore, setHasMore] = useState<boolean>(initialHasMore);
  const [loadingMore, setLoadingMore] = useState(false);
  const [failedMore, setFailedMore] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  // The globe, countries, and "Most visited" reflect the WHOLE retained window,
  // not just the recent list this component paginates. It is seeded from the
  // initial load and, live, expanded to the full stream once by a one-shot fetch;
  // the poll then keeps it fresh. (The stream holds at most STREAM_MAXLEN rows,
  // so this is a bounded, single fetch — not an unbounded scroll.)
  const [aggVisits, setAggVisits] = useState<VisitEvent[]>(initialVisits);
  const [mostVisitedShown, setMostVisitedShown] = useState(MOST_VISITED_PAGE);
  // Relative times are a clock race against the server pass, so they only
  // appear once hydrated; the first paint (server and first client render) is
  // identical because `mounted` is false in both.
  const mounted = useMounted();

  // Defer the WebGL globe (and its cobe chunk) until its column is near the
  // viewport. The sized placeholder in the shell reserves the space, so the
  // later mount never shifts layout; on desktop the column is visible at once.
  const [globeRef, globeInView] = useInView<HTMLElement>("240px 0px");

  // Guards so a slow/duplicate response can never reorder the list.
  const loadingMoreRef = useRef(false);
  const loadedAllRef = useRef(false);

  // Re-anchor "now" on a coarse tick so the labels age without a re-fetch storm.
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  // Pull the full retained window once for the globe/leaderboards. Static mode
  // already has every seed row in `initialVisits`, so this only runs live.
  useEffect(() => {
    if (!live || loadedAllRef.current) return;
    loadedAllRef.current = true;
    let active = true;
    fetchAllVisits()
      .then((all) => {
        if (active && all) setAggVisits(all);
      })
      .catch(() => {
        // A failed bulk load leaves the aggregates on the head page.
      });
    return () => {
      active = false;
    };
  }, [live]);

  // Live head: poll the newest page and merge it over whatever is loaded, so
  // new visits surface without disturbing the older pages already shown.
  useEffect(() => {
    if (!live) return;

    let active = true;
    const load = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const payload = await fetchPage(null);
        if (active && payload) {
          setVisits((current) => mergeById(current, payload.visits));
          setAggVisits((current) => mergeById(current, payload.visits));
          setCount(payload.count);
        }
      } catch {
        // A failed poll keeps the last good feed on screen.
      }
    };

    load();
    const id = window.setInterval(load, POLL_MS);
    return () => {
      active = false;
      window.clearInterval(id);
    };
  }, [live]);

  // Fetch the next older page, keyed by the oldest loaded stream id.
  const loadMore = useCallback(async () => {
    if (loadingMoreRef.current || !hasMore || !cursor) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    setFailedMore(false);
    try {
      const payload = await fetchPage(cursor);
      if (payload) {
        setVisits((current) => mergeById(current, payload.visits));
        setCursor(payload.nextCursor ?? null);
        setHasMore(Boolean(payload.hasMore));
      } else {
        setFailedMore(true);
      }
    } catch {
      setFailedMore(true);
    } finally {
      setLoadingMore(false);
      loadingMoreRef.current = false;
    }
  }, [hasMore, cursor]);

  // Globe, countries, and "Most visited" read the full retained window; the
  // recent-visits list below stays on its own paginated `visits`.
  const markers = useMemo(() => visitMarkers(aggVisits), [aggVisits]);
  const countries = useMemo(() => aggregateByCountry(aggVisits), [aggVisits]);
  const pages = useMemo(() => topPages(aggVisits), [aggVisits]);
  const countryCount = useMemo(() => countCountries(aggVisits), [aggVisits]);
  const visiblePages = pages.slice(0, mostVisitedShown);

  const totalLabel = count.toLocaleString("en-US");

  return (
    <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:gap-14">
      <section
        ref={globeRef}
        aria-label="Site visits around the world"
        className="mx-auto w-full max-w-[22rem] shrink-0 lg:sticky lg:top-8"
      >
        <GlobeShell>
          {globeInView ? <ActivityGlobe markers={markers} /> : null}
        </GlobeShell>
        {countries.length > 0 ? (
          <ul
            aria-label="Most-visited countries"
            className="mt-6 flex flex-wrap justify-center gap-1.5"
          >
            {countries.slice(0, 6).map((country) => (
              <li
                key={country.countryCode}
                className="flex items-center gap-1.5 rounded border border-zinc-200 px-2 py-1 font-mono text-xs text-zinc-600 dark:border-zinc-800 dark:text-zinc-400"
              >
                <span>{country.countryCode}</span>
                <span className="tabular text-zinc-500 dark:text-zinc-400">
                  ×{country.count}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <div className="min-w-0 flex-1">
        {live && visits.length > 0 ? (
          <p className="text-[0.9375rem] leading-7 text-zinc-600 dark:text-zinc-400">
            <span className="inline-flex items-center gap-1.5">
              <span
                className="bg-accent-600 dark:bg-accent-300 inline-block h-1.5 w-1.5 rounded-full motion-safe:animate-pulse"
                aria-hidden="true"
              />
              live now
            </span>
          </p>
        ) : null}

        <dl className="mt-6 flex flex-wrap gap-x-10 gap-y-4">
          <Stat label="Visits" value={totalLabel} />
          <Stat label="Countries" value={String(countryCount)} />
          <Stat label="Tracked since" value={formatDate(VISITS_TRACKED_SINCE, "en-US")} />
        </dl>

        {pages.length > 0 ? (
          <section aria-labelledby="top-pages" className="mt-10">
            <h2
              id="top-pages"
              className="text-base font-semibold tracking-[-0.011em] text-zinc-900 dark:text-zinc-100"
            >
              Most visited
            </h2>
            <ul className="mt-2 divide-y divide-zinc-200 border-t border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
              {visiblePages.map((page) => (
                <li
                  key={page.page}
                  className="flex items-baseline justify-between gap-4 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <CustomLink
                      href={page.page}
                      className="hover:text-accent-600 dark:hover:text-accent-300 block min-w-0 truncate text-[0.9375rem] text-zinc-800 transition-colors dark:text-zinc-200"
                    >
                      {page.title ?? page.page}
                    </CustomLink>
                    {page.title ? (
                      <p className="mt-0.5 truncate font-mono text-xs text-zinc-500 dark:text-zinc-400">
                        {page.page}
                      </p>
                    ) : null}
                  </div>
                  <span className="tabular shrink-0 font-mono text-xs text-zinc-500 dark:text-zinc-400">
                    {page.count} {page.count === 1 ? "view" : "views"}
                  </span>
                </li>
              ))}
            </ul>
            {pages.length > mostVisitedShown ? (
              <div className="mt-4 flex justify-center">
                <button
                  type="button"
                  onClick={() => setMostVisitedShown((n) => n + MOST_VISITED_PAGE)}
                  className="hover:text-accent-600 dark:hover:text-accent-300 rounded border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:border-zinc-400 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-600"
                >
                  Show more pages
                </button>
              </div>
            ) : null}
          </section>
        ) : null}

        <section aria-labelledby="recent-visits" className="mt-10">
          <h2
            id="recent-visits"
            className="text-base font-semibold tracking-[-0.011em] text-zinc-900 dark:text-zinc-100"
          >
            Recent visits
          </h2>
          {visits.length === 0 ? (
            <p className="mt-3 text-[0.9375rem] text-zinc-600 dark:text-zinc-400">
              No visits yet. Give it a minute.
            </p>
          ) : (
            <>
              <ul className="mt-2 divide-y divide-zinc-200 border-t border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
                {visits.map((visit) => (
                  <VisitRow key={visit.id} visit={visit} now={now} mounted={mounted} />
                ))}
              </ul>

              {/* Manual pagination: the reader clicks to pull in the next older
                  page, so nothing loads on its own, with a clear end state so the
                  feed never just silently stops. */}
              <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
                {hasMore ? (
                  <>
                    <button
                      type="button"
                      onClick={() => void loadMore()}
                      disabled={loadingMore}
                      className="hover:text-accent-600 dark:hover:text-accent-300 inline-flex items-center gap-2 rounded border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:border-zinc-400 disabled:cursor-default disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-600"
                    >
                      {loadingMore ? (
                        <>
                          <Spinner />
                          Loading…
                        </>
                      ) : (
                        "Show more visits"
                      )}
                    </button>
                    {failedMore ? (
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        Couldn&rsquo;t load more — try again.
                      </span>
                    ) : null}
                  </>
                ) : (
                  <span className="font-mono text-xs tracking-[0.08em] text-zinc-500 uppercase dark:text-zinc-400">
                    That&rsquo;s every visit we&rsquo;ve tracked
                  </span>
                )}
              </div>
            </>
          )}
        </section>

        <p className="mt-8 font-mono text-xs tracking-[0.08em] text-zinc-500 uppercase dark:text-zinc-400">
          {mounted
            ? `over ${trackedDays(VISITS_TRACKED_SINCE, new Date(now).toISOString())} days`
            : ""}
        </p>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-mono text-xs tracking-[0.08em] text-zinc-500 uppercase dark:text-zinc-400">
        {label}
      </dt>
      <dd className="tabular mt-1 text-2xl font-semibold tracking-[-0.022em] text-zinc-900 dark:text-zinc-100">
        {value}
      </dd>
    </div>
  );
}

function Spinner() {
  return (
    <span
      className="inline-block h-3 w-3 animate-spin rounded-full border border-zinc-400 border-t-transparent motion-reduce:animate-none motion-reduce:border-t-zinc-400"
      aria-hidden="true"
    />
  );
}

function VisitRow({
  visit,
  now,
  mounted,
}: {
  visit: VisitEvent;
  now: number;
  mounted: boolean;
}) {
  return (
    <li className="flex items-baseline justify-between gap-4 py-2.5">
      <div className="min-w-0 flex-1">
        <CustomLink
          href={visit.page}
          className="hover:text-accent-600 dark:hover:text-accent-300 block min-w-0 truncate text-[0.9375rem] text-zinc-800 transition-colors dark:text-zinc-200"
        >
          {visit.title ?? visit.page}
        </CustomLink>
        <p className="mt-0.5 font-mono text-xs text-zinc-500 dark:text-zinc-400">
          {locationLabel(visit)}
        </p>
      </div>

      {mounted ? (
        <time
          dateTime={visit.ts}
          className="tabular shrink-0 font-mono text-xs text-zinc-500 dark:text-zinc-400"
        >
          {formatRelative(visit.ts, now)}
        </time>
      ) : (
        <span className="shrink-0 font-mono text-xs text-zinc-500 dark:text-zinc-400">
          <time dateTime={visit.ts}>·</time>
        </span>
      )}
    </li>
  );
}
