/**
 * Server-only delivery of captured errors to Discord, reusing the SAME bot
 * credentials `/ama` already posts with (`DISCORD_BOT_TOKEN` + a channel or DM
 * target). Registering it via `instrumentation.ts` means the operator learns a
 * deploy is broken without standing up a separate APM account or pointing
 * `ERROR_REPORT_URL` at a third party.
 *
 * It is transport-thin on purpose: `discord.ts` owns auth/target/limits, and all
 * the *deciding* — never report our own transport failures, never spam a
 * persistent error, never let the public report endpoint spend the whole budget
 * — lives here.
 */

import "server-only";

import {
  clampToLimit,
  MAX_EMBED_DESCRIPTION,
  MAX_EMBED_FIELD_VALUE,
  MAX_EMBED_FOOTER_TEXT,
  MAX_EMBED_TITLE,
  sendDiscordMessage,
  type DiscordEmbed,
} from "./discord";

/** Signal Red, so an error embed is visually distinct from the AMA (blue) ones. */
const ACCENT = 0xda3a40;

// A persistent error (a route that throws on every poll, a corrupt row batched
// per read) must not fan out one DM per occurrence. So we de-dup by signature —
// but over a *window*, not for the life of the process: an error still firing
// half an hour later is worth hearing about again, and a process on Vercel can
// outlive the incident that a permanent mute would hide.
const DEDUPE_WINDOW_MS = 30 * 60_000;
// LRU bound on the ledger, so a long tail of distinct errors cannot grow it
// without limit. Reaching it evicts the oldest entry; it never stops alerting.
const MAX_TRACKED_SIGNATURES = 200;
// And a budget on what actually reaches the wire per window, since distinct
// signatures are cheap to manufacture (see `isUntrusted`). Exceeding it drops
// alerts until the window rolls — degraded, but self-healing.
const MAX_ALERTS_PER_WINDOW = 20;
// Of that budget, the most the public `POST /api/report` may spend. A flood of
// browser reports must never crowd out the server-side alerts, which are the
// ones nobody else can fake.
const MAX_UNTRUSTED_ALERTS_PER_WINDOW = 5;

/** signature → when its de-dup entry expires. Insertion order is the LRU order. */
const sent = new Map<string, number>();

let windowStartedAt = 0;
let alertsThisWindow = 0;
let untrustedAlertsThisWindow = 0;

function isDiscordOwnFailure(scope: unknown): boolean {
  // Never report the failures that come out of the Discord transport itself —
  // that is the loop (a send failure would spawn another send) and the noise
  // (a broken webhook should surface once in the log, not as its own alert).
  return typeof scope === "string" && scope.startsWith("discord/");
}

/**
 * Did this payload arrive from the browser, through the public `POST /api/report`?
 *
 * That route is unauthenticated and its limiter fails open, so its `name` /
 * `message` / `scope` are attacker-chosen: anyone can mint an unbounded number
 * of distinct signatures. Worth alerting on, worth trusting with only a slice
 * of the budget. The marker is set by the route itself, never read from the body.
 */
function isUntrusted(payload: Record<string, unknown>): boolean {
  return payload.source === "browser";
}

function rollWindow(now: number): void {
  if (now - windowStartedAt < DEDUPE_WINDOW_MS) return;
  windowStartedAt = now;
  alertsThisWindow = 0;
  untrustedAlertsThisWindow = 0;
}

function signatureOf(payload: Record<string, unknown>): string {
  // `digest` matters more than it looks: in a production build React replaces a
  // server-component error's message with one fixed boilerplate string, so
  // scope+name+message alone collapses *every* distinct server error into a
  // single signature and only the first one would ever alert. The digest is the
  // only field that still tells them apart.
  const digest = typeof payload.digest === "string" ? payload.digest : "";
  return [
    String(payload.scope ?? ""),
    String(payload.name ?? ""),
    String(payload.message ?? ""),
    digest,
  ].join("|");
}

function isDuplicate(signature: string, now: number): boolean {
  const expiresAt = sent.get(signature);
  if (expiresAt === undefined) return false;
  if (expiresAt > now) return true;
  sent.delete(signature);
  return false;
}

function remember(signature: string, now: number): void {
  // Re-insert so the entry moves to the end: `Map` keeps insertion order, which
  // makes the first key the least recently alerted one.
  sent.delete(signature);
  sent.set(signature, now + DEDUPE_WINDOW_MS);
  while (sent.size > MAX_TRACKED_SIGNATURES) {
    const oldest = sent.keys().next();
    if (oldest.done) break;
    sent.delete(oldest.value);
  }
}

function buildEmbed(payload: Record<string, unknown>): DiscordEmbed {
  const scope = typeof payload.scope === "string" ? payload.scope : "error";
  const name = typeof payload.name === "string" ? payload.name : "";
  const message = typeof payload.message === "string" ? payload.message : "";
  const line = [name, message].filter(Boolean).join(": ");
  const embed: DiscordEmbed = {
    title: clampToLimit(`error · ${scope}`, MAX_EMBED_TITLE),
    description: clampToLimit(line || "(no message)", MAX_EMBED_DESCRIPTION),
    color: ACCENT,
    timestamp: new Date().toISOString(),
  };
  const digest = typeof payload.digest === "string" ? payload.digest : "";
  const url = typeof payload.url === "string" ? payload.url : "";
  const fields: { name: string; value: string; inline?: boolean }[] = [];
  if (url) {
    fields.push({
      name: "page",
      value: clampToLimit(url, MAX_EMBED_FIELD_VALUE),
      inline: true,
    });
  }
  if (fields.length > 0) embed.fields = fields;
  if (digest) {
    embed.footer = { text: clampToLimit(`digest ${digest}`, MAX_EMBED_FOOTER_TEXT) };
  }
  return embed;
}

/**
 * Deliver one error to Discord, best-effort and fire-and-forget. The sink passed
 * to `setReportSink` — safe to call from `captureError`'s synchronous path.
 */
export function reportErrorToDiscord(payload: Record<string, unknown>): void {
  if (isDiscordOwnFailure(payload.scope)) return;

  const now = Date.now();
  rollWindow(now);

  const signature = signatureOf(payload);
  if (isDuplicate(signature, now)) return;

  const untrusted = isUntrusted(payload);
  if (alertsThisWindow >= MAX_ALERTS_PER_WINDOW) return;
  if (untrusted && untrustedAlertsThisWindow >= MAX_UNTRUSTED_ALERTS_PER_WINDOW) return;

  // The budget is spent on the *attempt*, not the delivery. Attempts are what
  // bounds outbound traffic, and charging only for successes would let a Discord
  // outage turn a hot error path into an unbounded retry loop.
  alertsThisWindow += 1;
  if (untrusted) untrustedAlertsThisWindow += 1;

  // Claim the signature before the send, so a burst of the same error in one
  // tick collapses to a single attempt rather than racing the await.
  remember(signature, now);

  // `sendDiscordMessage` resolves either way and never throws, and it reports its
  // OWN failures back through `captureError` under a `discord/*` scope — which the
  // guard above drops, so a broken transport cannot spawn an alert loop.
  void sendDiscordMessage({ embeds: [buildEmbed(payload)] }).then((delivered) => {
    // Nothing reached Discord — a 429, a timeout, a bot that is not configured
    // yet. Release the claim so the next occurrence retries instead of losing
    // the alert for the whole window; the budget above still caps how often that
    // retry actually reaches the wire.
    if (!delivered) sent.delete(signature);
  });
}

/** Test seam: clear the de-dup ledger and budgets so cases are independent. */
export function resetErrorAlertCacheForTests(): void {
  sent.clear();
  windowStartedAt = 0;
  alertsThisWindow = 0;
  untrustedAlertsThisWindow = 0;
}
