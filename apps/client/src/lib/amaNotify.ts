/**
 * Tell the author when a question arrives.
 *
 * The inbox is useless if nobody knows to look in it, so a stored question
 * fires one POST at whatever `AMA_NOTIFY_URL` points to. Deliberately a plain
 * webhook rather than an email dependency: `observability.ts` already
 * established that shape here, and it means Slack, Discord, or anything that
 * accepts JSON works without a provider SDK or an API key.
 *
 * Two properties this has to hold. It never blocks the asker — the caller runs
 * it in `after()`, so the response is already on its way when the POST starts.
 * And it never fails the submission: a question that is in Redis has been
 * delivered, whether or not the author's Slack heard about it.
 *
 * Note what leaves the building: the question text and any contact the asker
 * volunteered are sent to the configured endpoint. That is the point of the
 * feature, but it is worth knowing before pointing this at a shared channel.
 */

import type { AskRecord } from "./amaInbox";
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

/** Fire one notification. Resolves either way; never throws. */
export async function notifyNewQuestion(record: AskRecord): Promise<void> {
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
