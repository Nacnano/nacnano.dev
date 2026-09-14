"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import CustomLink from "@/components/Link";
import { formatDate } from "@/lib/formatDate";
import {
  aggregateByCountry,
  countCountries,
  countryFlag,
  formatRelative,
  topPages,
  trackedDays,
  visitMarkers,
} from "@/lib/activity";
import {
  VISITS_TRACKED_SINCE,
  isVisitFeedPayload,
  type VisitEvent,
  type VisitFeedPayload,
} from "@/lib/activityTypes";
import ActivityGlobe from "./ActivityGlobe";

// Poll gently: a couple of seconds is plenty for a feed that updates when
// someone, somewhere loads this page. Paused while the tab is hidden.
const POLL_MS = 5000;
const RECENT_LIMIT = 15;
const TOP_PAGES = 5;

function visitPathname(): string {
  return `${window.location.pathname}${window.location.search}`;
}

function locationLabel(visit: VisitEvent): string {
  const country = visit.countryCode
    ? `${countryFlag(visit.countryCode)} ${visit.countryCode}`
    : "";
  return [visit.city, country].filter(Boolean).join(" · ") || "somewhere";
}

type Props = {
  initialVisits: VisitEvent[];
  initialCount: number;
  live: boolean;
};

export default function ActivityFeed({
  initialVisits,
  initialCount,
  live,
}: Props) {
  const [visits, setVisits] = useState<VisitEvent[]>(initialVisits);
  const [count, setCount] = useState<number>(initialCount);
  // Relative times are a clock race against the server pass, so they only
  // appear once hydrated; the first paint (server and first client render) is
  // identical because `mounted` is false in both.
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const recorded = useRef(false);

  const replace = useCallback((payload: VisitFeedPayload) => {
    setVisits(payload.visits);
    setCount(payload.count);
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Re-anchor "now" on a coarse tick so the labels age without a re-fetch storm.
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!live) return;

    let active = true;
    const load = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const response = await fetch("/api/activity/feed", {
          headers: { accept: "application/json" },
        });
        if (!response.ok) return;
        const payload: unknown = await response.json();
        if (active && isVisitFeedPayload(payload)) replace(payload);
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
  }, [live, replace]);

  // Log this pageview once, and never again, so a re-render or a second mount
  // does not double-count the same reader.
  useEffect(() => {
    if (!live || recorded.current) return;
    recorded.current = true;
    void fetch("/api/activity/visit", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ path: visitPathname(), title: document.title }),
      keepalive: true,
    }).catch(() => {});
  }, [live]);

  const markers = useMemo(() => visitMarkers(visits), [visits]);
  const countries = useMemo(() => aggregateByCountry(visits), [visits]);
  const pages = useMemo(() => topPages(visits), [visits]);
  const recent = useMemo(() => visits.slice(0, RECENT_LIMIT), [visits]);
  const countryCount = useMemo(() => countCountries(visits), [visits]);

  return (
    <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:gap-14">
      <section
        aria-label="Site visits around the world"
        className="mx-auto w-full max-w-[22rem] shrink-0 lg:sticky lg:top-8"
      >
        <div className="aspect-square w-full">
          <ActivityGlobe markers={markers} />
        </div>
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
                <span aria-hidden="true">{countryFlag(country.countryCode)}</span>
                <span>{country.countryCode}</span>
                <span className="tabular text-zinc-400 dark:text-zinc-500">
                  ×{country.count}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <div className="min-w-0 flex-1">
        <p className="text-[0.9375rem] leading-7 text-zinc-600 dark:text-zinc-400">
          A public record of visits to this site. The globe lights up wherever
          people have shown up, newest first below.
          {live && visits.length > 0 ? (
            <span className="inline-flex items-center gap-1.5">
              <span
                className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-accent-500 motion-safe:animate-pulse"
                aria-hidden="true"
              />
              live now
            </span>
          ) : null}
        </p>

        <dl className="mt-6 flex flex-wrap gap-x-10 gap-y-4">
          <Stat label="Visits" value={count.toLocaleString("en-US")} />
          <Stat label="Countries" value={String(countryCount)} />
          <Stat
            label="Tracked since"
            value={formatDate(VISITS_TRACKED_SINCE, "en-US")}
          />
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
              {pages.slice(0, TOP_PAGES).map((page) => (
                <li
                  key={page.page}
                  className="flex items-baseline justify-between gap-4 py-2.5"
                >
                  <CustomLink
                    href={page.page}
                    className="min-w-0 truncate text-[0.9375rem] text-zinc-800 transition-colors hover:text-accent-600 dark:text-zinc-200 dark:hover:text-accent-300"
                  >
                    {page.title ?? page.page}
                  </CustomLink>
                  <span className="shrink-0 font-mono text-xs tabular text-zinc-500 dark:text-zinc-400">
                    {page.count} {page.count === 1 ? "view" : "views"}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section aria-labelledby="recent-visits" className="mt-10">
          <h2
            id="recent-visits"
            className="text-base font-semibold tracking-[-0.011em] text-zinc-900 dark:text-zinc-100"
          >
            Recent visits
          </h2>
          {recent.length === 0 ? (
            <p className="mt-3 text-[0.9375rem] text-zinc-600 dark:text-zinc-400">
              No visits yet. Give it a minute.
            </p>
          ) : (
            <ul className="mt-2 divide-y divide-zinc-200 border-t border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
              {recent.map((visit) => (
                <VisitRow
                  key={visit.id}
                  visit={visit}
                  now={now}
                  mounted={mounted}
                />
              ))}
            </ul>
          )}
        </section>

        <p className="mt-8 font-mono text-xs uppercase tracking-[0.08em] text-zinc-400 dark:text-zinc-600">
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
      <dt className="font-mono text-xs uppercase tracking-[0.08em] text-zinc-500 dark:text-zinc-400">
        {label}
      </dt>
      <dd className="mt-1 text-2xl font-semibold tabular tracking-[-0.022em] text-zinc-900 dark:text-zinc-100">
        {value}
      </dd>
    </div>
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
          className="block min-w-0 truncate text-[0.9375rem] text-zinc-800 transition-colors hover:text-accent-600 dark:text-zinc-200 dark:hover:text-accent-300"
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
          className="shrink-0 font-mono text-xs tabular text-zinc-500 dark:text-zinc-400"
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
