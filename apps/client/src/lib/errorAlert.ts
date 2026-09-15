/**
 * Server-only delivery of captured errors to Discord, reusing the SAME bot
 * credentials `/ama` already posts with (`DISCORD_BOT_TOKEN` + a channel or DM
 * target). Registering it via `instrumentation.ts` means the operator learns a
 * deploy is broken without standing up a separate APM account or pointing
 * `ERROR_REPORT_URL` at a third party.
 *
 * It is transport-thin on purpose: `discord.ts` owns auth/target/limits, and all
 * the *deciding* — never report our own transport failures, never spam a
 * persistent error — lives here.
 */

import "server-only";

import {
  clampToLimit,
  MAX_CONTENT,
  MAX_EMBED_DESCRIPTION,
  sendDiscordMessage,
  type DiscordEmbed,
} from "./discord";

/** Signal Red, so an error embed is visually distinct from the AMA (blue) ones. */
const ACCENT = 0xda3a40;
// A persistent error (a route that throws on every poll, a corrupt row batched
// per read) must not fan out one DM per occurrence. We key by signature and send
// each distinct failure once per process.
const MAX_TRACKED_SIGNATURES = 200;

const sent = new Set<string>();

function isDiscordOwnFailure(scope: unknown): boolean {
  // Never report the failures that come out of the Discord transport itself —
  // that is the loop (a send failure would spawn another send) and the noise
  // (a broken webhook should surface once in the log, not as its own alert).
  return typeof scope === "string" && scope.startsWith("discord/");
}

function signatureOf(payload: Record<string, unknown>): string {
  return `${String(payload.scope ?? "")}|${String(payload.name ?? "")}|${String(
    payload.message ?? ""
  )}`;
}

function buildEmbed(payload: Record<string, unknown>): DiscordEmbed {
  const scope = typeof payload.scope === "string" ? payload.scope : "error";
  const name = typeof payload.name === "string" ? payload.name : "";
  const message = typeof payload.message === "string" ? payload.message : "";
  const line = [name, message].filter(Boolean).join(": ");
  const embed: DiscordEmbed = {
    title: clampToLimit(`error · ${scope}`, MAX_CONTENT),
    description: clampToLimit(line || "(no message)", MAX_EMBED_DESCRIPTION),
    color: ACCENT,
    timestamp: new Date().toISOString(),
  };
  const digest = typeof payload.digest === "string" ? payload.digest : "";
  const url = typeof payload.url === "string" ? payload.url : "";
  const fields: { name: string; value: string; inline?: boolean }[] = [];
  if (url) fields.push({ name: "page", value: clampToLimit(url, 1024), inline: true });
  if (fields.length > 0) embed.fields = fields;
  if (digest) embed.footer = { text: clampToLimit(`digest ${digest}`, MAX_CONTENT) };
  return embed;
}

/**
 * Deliver one error to Discord, best-effort and fire-and-forget. The sink passed
 * to `setReportSink` — safe to call from `captureError`'s synchronous path.
 */
export function reportErrorToDiscord(payload: Record<string, unknown>): void {
  if (isDiscordOwnFailure(payload.scope)) return;

  const signature = signatureOf(payload);
  if (sent.has(signature)) return;
  if (sent.size >= MAX_TRACKED_SIGNATURES) return;
  sent.add(signature);

  // `sendDiscordMessage` resolves either way and never throws, and it reports its
  // OWN failures back through `captureError` under a `discord/*` scope — which the
  // guard above drops, so a broken transport cannot spawn an alert loop.
  void sendDiscordMessage({ embeds: [buildEmbed(payload)] });
}

/** Test seam: clear the de-dup ledger so cases are independent. */
export function resetErrorAlertCacheForTests(): void {
  sent.clear();
}
