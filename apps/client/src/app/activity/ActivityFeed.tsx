"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import CustomLink from "@/components/Link";
import { formatDate } from "@/lib/formatDate";
import {
  activityMarkers,
  countryFlag,
  formatRelative,
  groupByDay,
  trackedDays,
} from "@/lib/activity";
import {
  ACTIVITY_KIND_LABELS,
  ACTIVITY_TRACKED_SINCE,
  isActivityFeedPayload,
  type ActivityEvent,
  type ActivityFeedPayload,
} from "@/lib/activityTypes";
import ActivityGlobe from "./ActivityGlobe";
import ActivityIcon from "./ActivityIcon";

// Poll gently: a couple of seconds is plenty for a feed that updates when
// someone, somewhere loads this page. Paused while the tab is hidden.
const POLL_MS = 5000;

function visitPathname(): string {
  return `${window.location.pathname}${window.location.search}`;
}

type Props = {
  initialEvents: ActivityEvent[];
  initialCount: number;
  live: boolean;
};

export default function ActivityFeed({
  initialEvents,
  initialCount,
  live,
}: Props) {
  const [events, setEvents] = useState<ActivityEvent[]>(initialEvents);
  const [count, setCount] = useState<number>(initialCount);
  // Relative times are a clock race against the server pass, so they only
  // appear once hydrated; the first paint (server and first client render) is
  // identical because `mounted` is false in both.
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const recorded = useRef(false);

  const replace = useCallback((payload: ActivityFeedPayload) => {
    setEvents(payload.events);
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
        if (active && isActivityFeedPayload(payload)) replace(payload);
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

  const days = useMemo(() => groupByDay(events), [events]);
  const markers = useMemo(() => activityMarkers(events), [events]);

  return (
    <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:gap-14">
      <section
        aria-label="Recent activity around the world"
        className="mx-auto w-full max-w-[22rem] shrink-0 lg:sticky lg:top-8"
      >
        <div className="aspect-square w-full">
          <ActivityGlobe markers={markers} />
        </div>
      </section>

      <div className="min-w-0 flex-1">
        <p className="text-[0.9375rem] leading-7 text-zinc-600 dark:text-zinc-400">
          A public feed of what has been happening here — likes, visits,
          things read and shipped.
          {live && events.length > 0 ? (
            <span className="inline-flex items-center gap-1.5">
              <span
                className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-accent-500 motion-safe:animate-pulse"
                aria-hidden="true"
              />
              live now
            </span>
          ) : null}
        </p>

        <p className="mt-2 font-mono text-xs uppercase tracking-[0.08em] text-zinc-500 dark:text-zinc-400">
          {count.toLocaleString("en-US")} events tracked since{" "}
          {formatDate(ACTIVITY_TRACKED_SINCE, "en-US")}
          {mounted ? ` · over ${trackedDays(ACTIVITY_TRACKED_SINCE, new Date(now).toISOString())} days` : ""}
        </p>

        <ol className="mt-8 space-y-8">
          {days.map((day) => (
            <li key={day.day}>
              <h2 className="font-mono text-xs uppercase tracking-[0.08em] text-zinc-500 dark:text-zinc-400">
                {formatDate(`${day.day}T00:00:00.000Z`, "en-US")}
              </h2>
              <ul className="mt-1 divide-y divide-zinc-200 border-t border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
                {day.events.map((event) => (
                  <ActivityRow
                    key={event.id}
                    event={event}
                    now={now}
                    mounted={mounted}
                  />
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function ActivityRow({
  event,
  now,
  mounted,
}: {
  event: ActivityEvent;
  now: number;
  mounted: boolean;
}) {
  const flag = countryFlag(event.countryCode);
  const label = ACTIVITY_KIND_LABELS[event.kind] ?? event.kind;
  const body = <>{event.summary}</>;

  return (
    <li className="flex items-start gap-3 py-3">
      <span
        className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded text-zinc-500 dark:text-zinc-400"
        title={label}
      >
        <ActivityIcon kind={event.kind} />
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-[0.9375rem] leading-7 text-zinc-800 dark:text-zinc-200">
          {event.href ? (
            <CustomLink
              href={event.href}
              className="rounded text-zinc-800 underline decoration-zinc-300 decoration-1 underline-offset-2 transition-colors hover:text-accent-600 hover:decoration-accent-400 dark:text-zinc-200 dark:decoration-zinc-700 dark:hover:text-accent-300"
            >
              {body}
            </CustomLink>
          ) : (
            body
          )}
          {flag ? <span className="ml-1.5" aria-hidden="true">{flag}</span> : null}
        </p>

        <p className="mt-0.5 font-mono text-xs text-zinc-500 dark:text-zinc-400">
          {event.source ? `${event.source} · ` : ""}
          {mounted ? (
            <time dateTime={event.ts}>{formatRelative(event.ts, now)}</time>
          ) : (
            <span suppressHydrationWarning>
              <time dateTime={event.ts}>·</time>
            </span>
          )}
        </p>
      </div>
    </li>
  );
}
