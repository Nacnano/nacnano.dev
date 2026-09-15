/**
 * Tell the author when a question arrives.
 *
 * The inbox is useless if nobody knows to look in it, so a stored question is
 * announced over every transport that is configured, and over none if none is:
 *
 * - `AMA_NOTIFY_URL` — one JSON POST. Slack incoming webhooks, Discord
 *   webhooks and anything generic all read the same body.
 * - A Discord bot — `DISCORD_BOT_TOKEN` plus a channel or a user to DM. See
 *   `discord.ts` for what a bot buys over the webhook above.
 *
 * Both may be on at once; they are independent, and neither failing affects
 * the other or the asker.
 *
 * Two properties this has to hold. It never blocks the asker — the caller runs
 * it in `after()`, so the response is already on its way when the POST starts.
 * And it never fails the submission: a question that is in Redis has been
 * delivered, whether or not the author's Discord heard about it.
 *
 * Note what leaves the building: the question text and any contact the asker
 * volunteered are sent to whatever is configured. That is the point of the
 * feature, but it is worth knowing before pointing this at a shared channel.
 */

import "server-only";

import type { AskRecord } from "./amaInbox";
import {
  clampToLimit,
  isDiscordConfigured,
  sendDiscordMessage,
  MAX_EMBED_DESCRIPTION,
  MAX_EMBED_FIELD_VALUE,
  type DiscordMessage,
} from "./discord";
import siteMetadata from "@/data/siteMetadata";
import { captureError } from "./observability";

/** Enough of the question to triage it from a phone notification. */
const MAX_PREVIEW = 280;
/** A hanging webhook must not keep the serverless function alive indefinitely. */
const TIMEOUT_MS = 5_000;

/**
 * Read straight off `process.env`, never through a computed key: that is what
 * lets turbo see the variable in its cache key and the lint rule catch an
 * undeclared one.
 *
 * It MUST stay non-`NEXT_PUBLIC_`, for the same reason `ERROR_REPORT_URL` does
 * — the missing prefix is the only thing keeping a webhook URL out of the
 * browser bundle, and a leaked Slack webhook is a spam endpoint for whoever
 * finds it.
 */
export function isNotifyConfigured(): boolean {
  return !!process.env.AMA_NOTIFY_URL;
}

/** Collapse to one line and cap it, so a 1000-character question is still a usable alert. */
export function questionPreview(question: string, max = MAX_PREVIEW): string {
  const collapsed = question.replace(/\s+/g, " ").trim();
  if (collapsed.length <= max) return collapsed;
  return `${collapsed.slice(0, max - 1).trimEnd()}…`;
}

/**
 * One body that three kinds of consumer can read.
 *
 * Slack's incoming webhooks render `text`, Discord's render `content`, and both
 * ignore keys they do not recognise — so sending both, plus the structured
 * fields, means a single env var works with either service, or with a generic
 * JSON endpoint, without a per-provider adapter in here.
 */
export function notificationPayload(record: AskRecord) {
  const summary = [
    "New question on /ama:",
    "",
    questionPreview(record.question),
    ...(record.contact ? ["", `from ${record.contact}`] : []),
  ].join("\n");

  return {
    text: summary,
    content: summary,
    source: "ama",
    id: record.id,
    ts: record.ts,
    question: record.question,
    ...(record.contact ? { contact: record.contact } : {}),
  };
}

/** POST the generic payload at `AMA_NOTIFY_URL`. Resolves either way; never throws. */
async function postWebhook(record: AskRecord): Promise<void> {
  const endpoint = process.env.AMA_NOTIFY_URL;
  if (!endpoint) return;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(notificationPayload(record)),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    // A typo'd or revoked webhook URL fails quietly forever otherwise: the
    // question still lands, and the author simply stops being told about it.
    if (!response.ok) {
      captureError(new Error(`Notify endpoint returned ${response.status}`), {
        scope: "ama/notify",
      });
    }
  } catch (error) {
    captureError(error, { scope: "ama/notify" });
  }
}

/** Signal Blue, so the embed's accent matches the site it came from. */
const ACCENT = 0x2556da;

/**
 * The bot's version of the same news, as an embed.
 *
 * An embed rather than plain `content` because Discord renders the question as
 * a quoted block with the contact as its own field, which is the difference
 * between triaging from the notification and having to open the site. The
 * question keeps its line breaks here — unlike the one-line webhook preview,
 * there is room for them.
 */
export function amaDiscordMessage(record: AskRecord): DiscordMessage {
  return {
    embeds: [
      {
        title: "New question on /ama",
        url: `${siteMetadata.siteUrl}/ama`,
        description: clampToLimit(record.question.trim(), MAX_EMBED_DESCRIPTION),
        color: ACCENT,
        timestamp: record.ts,
        ...(record.contact
          ? {
              fields: [
                {
                  name: "From",
                  value: clampToLimit(record.contact, MAX_EMBED_FIELD_VALUE),
                  inline: true,
                },
              ],
            }
          : {}),
        footer: { text: record.id },
      },
    ],
  };
}

async function postDiscordBot(record: AskRecord): Promise<void> {
  if (!isDiscordConfigured()) return;
  await sendDiscordMessage(amaDiscordMessage(record));
}

/**
 * Announce a question over every configured transport. Resolves either way;
 * never throws.
 *
 * `allSettled` rather than `all`: each transport already swallows its own
 * failures, but this is the function the submit path trusts not to throw, and
 * it should not start doing so the day a third transport forgets to.
 */
export async function notifyNewQuestion(record: AskRecord): Promise<void> {
  const results = await Promise.allSettled([postWebhook(record), postDiscordBot(record)]);
  for (const result of results) {
    if (result.status === "rejected") {
      captureError(result.reason, { scope: "ama/notify" });
    }
  }
}
