/**
 * The daily activity summary, posted as the Discord bot.
 *
 * The /activity page shows the feed to whoever opens it; this is the version
 * that comes to you unprompted: once a day, Vercel Cron hits
 * `GET /api/cron/daily-report` and the bot posts the last 24 hours — visits,
 * countries, top pages, and the running total — to the same channel or DM the
 * /ama notifications use (see `discord.ts` for why a bot rather than a
 * webhook). A quiet day still gets a report: silence from the bot is
 * ambiguous between "nobody visited" and "the cron never ran", and the second
 * is exactly the failure this feature must not hide.
 *
 * Delivery reuses the shared transport unchanged, so the same mention guard
 * and the same never-throws contract apply here. What lives in this module is
 * the windowing, the aggregation (borrowed from the pure helpers in
 * `activity.ts`), and the embed shape — the same split `amaNotify.ts` uses.
 */

import "server-only";

import { countCountries, isActivityLive, topPages, type PageAggregate } from "./activity";
import { readActivityFeed, STREAM_MAXLEN } from "./activityRedis";
import {
  clampToLimit,
  isDiscordConfigured,
  sendDiscordMessage,
  MAX_EMBED_FIELD_VALUE,
  type DiscordMessage,
} from "./discord";
import siteMetadata from "@/data/siteMetadata";
import type { VisitEvent } from "./activityTypes";

/**
 * The report covers the last 24 hours. Fixed rather than configurable: the
 * scheduled message and the manual `bun run activity:report` message must be
 * the same message, and one more knob is one more way for them to drift.
 */
export const REPORT_WINDOW_MS = 24 * 60 * 60 * 1000;

/** How many pages fit under "Top pages". Beyond that it stops being a digest
 *  you can read off a phone notification. */
const TOP_PAGES_IN_REPORT = 5;

/** Signal Blue, like the /ama embed (`amaNotify.ts`). */
const ACCENT = 0x2556da;

export type DailySummary = {
  /** Window bounds: `from` is inclusive, `to` is exclusive. */
  from: string;
  to: string;
  visits: number;
  countries: number;
  /** Most-viewed pages in the window, report order already applied. */
  top: PageAggregate[];
  /** Lifetime running total (the `activity:count` key), not window-bounded. */
  total: number;
};

export type DailyReportOutcome =
  | { sent: true; summary: DailySummary }
  | { sent: false; skipped: "no_discord" | "no_store"; summary: null }
  | { sent: false; skipped: "send_failed"; summary: DailySummary };

/**
 * The window is `[from, to)` — left-closed, right-open — so a visit landing
 * exactly on the boundary belongs to exactly one day's report, whichever side
 * of the cron it ran from.
 */
export function visitsInWindow(
  visits: readonly VisitEvent[],
  to: Date,
  windowMs = REPORT_WINDOW_MS
): VisitEvent[] {
  const end = to.getTime();
  const start = end - windowMs;
  return visits.filter((visit) => {
    const at = new Date(visit.ts).getTime();
    return at >= start && at < end;
  });
}

/** Roll a newest-first page of visits into the numbers the report shows. */
export function buildDailySummary(
  visits: readonly VisitEvent[],
  count: number,
  to: Date
): DailySummary {
  const inWindow = visitsInWindow(visits, to);
  return {
    from: new Date(to.getTime() - REPORT_WINDOW_MS).toISOString(),
    to: to.toISOString(),
    visits: inWindow.length,
    countries: countCountries(inWindow),
    top: topPages(inWindow).slice(0, TOP_PAGES_IN_REPORT),
    total: count,
  };
}

function plural(count: number, word: string): string {
  if (count === 1) return `1 ${word}`;
  // "country" -> "countries"; everything else just takes an -s.
  if (word.endsWith("y")) return `${count} ${word.slice(0, -1)}ies`;
  return `${count} ${word}s`;
}

function topLines(top: readonly PageAggregate[]): string {
  return top
    .map((page, index) =>
      page.title
        ? `${index + 1}. **${page.title}** \`${page.page}\` — ${plural(page.count, "visit")}`
        : `${index + 1}. \`${page.page}\` — ${plural(page.count, "visit")}`
    )
    .join("\n");
}

/**
 * The embed. A quiet day reads as one honest line rather than an absence: the
 * bot sends a report every day it is configured, and `0 visits` is the
 * report's way of saying the site was quiet, not that it was skipped.
 */
export function dailyReportMessage(summary: DailySummary): DiscordMessage {
  const day = summary.to.slice(0, 10);
  const description =
    summary.visits === 0
      ? `No visits in the 24 hours to ${day} ${summary.to.slice(11, 16)} UTC.`
      : `${plural(summary.visits, "visit")} from ${plural(summary.countries, "country")} in the 24 hours to ${day} ${summary.to.slice(11, 16)} UTC.`;

  return {
    embeds: [
      {
        title: `Daily activity — ${day}`,
        url: `${siteMetadata.siteUrl}/activity`,
        description,
        color: ACCENT,
        timestamp: summary.to,
        ...(summary.top.length > 0
          ? {
              fields: [
                {
                  name: "Top pages",
                  value: clampToLimit(topLines(summary.top), MAX_EMBED_FIELD_VALUE),
                },
              ],
            }
          : {}),
        footer: { text: `${plural(summary.total, "visit")} tracked in total` },
      },
    ],
  };
}

/**
 * Build the report and send it. Resolves an outcome either way; only throws
 * when the store itself throws (a broken live config the caller must see —
 * the same contract the feed route applies to `readActivityFeed`).
 *
 * The Discord check runs first so an unconfigured bot costs no store read,
 * and the store check second so a static deployment — which has no activity
 * to report at all — never reads or sends anything. A `false` from
 * `sendDiscordMessage` is Discord's refusal (already reported there); it is
 * surfaced as `send_failed` rather than retried, since a serverless function
 * that burns its timeout hammering a 429 helps nobody.
 */
export async function sendDailyActivityReport(
  now: Date = new Date()
): Promise<DailyReportOutcome> {
  if (!isDiscordConfigured()) {
    return { sent: false, skipped: "no_discord", summary: null };
  }
  if (!isActivityLive()) {
    return { sent: false, skipped: "no_store", summary: null };
  }

  // One read of the whole retained window, like the /activity server render:
  // the stream is capped at STREAM_MAXLEN, so "the last 24 hours" is always
  // answerable in one round trip. (In a pathological 1,500+ visits-a-day
  // month the count cap could trim hours off the start of the window; the
  // report then honestly under-reports rather than paginating for a number
  // nobody reads off a notification.)
  const payload = await readActivityFeed(STREAM_MAXLEN);
  const summary = buildDailySummary(payload.visits, payload.count, now);
  const sent = await sendDiscordMessage(dailyReportMessage(summary));
  return sent
    ? { sent: true, summary }
    : { sent: false, skipped: "send_failed", summary };
}
