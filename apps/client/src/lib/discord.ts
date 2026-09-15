/**
 * Posting as a Discord bot, over the REST API.
 *
 * Worth being clear about the shape, because "Discord bot" usually implies
 * more than this: there is no gateway connection and no slash commands here.
 * Those need a process that stays connected, and this site is a static deploy
 * with serverless functions. What a bot token buys over a plain webhook is a
 * real bot identity, the ability to post into any channel it has been invited
 * to, and direct messages — which is the useful one for a personal site, since
 * a DM reaches a phone without a server sitting in a channel nobody reads.
 *
 * The module is transport only. What a given feature wants to *say* belongs to
 * that feature (see `amaNotify.ts`); what lives here is auth, target
 * resolution, limits and the mention guard.
 */

import "server-only";

import { captureError } from "./observability";

const DEFAULT_API_BASE = "https://discord.com/api/v10";
/** A hanging call must not keep the serverless function alive indefinitely. */
const TIMEOUT_MS = 5_000;

// Discord's documented ceilings. Exceeding one is a 400, which would turn a
// long question into a silently missing notification.
export const MAX_CONTENT = 2000;
export const MAX_EMBED_TITLE = 256;
export const MAX_EMBED_DESCRIPTION = 4096;
export const MAX_EMBED_FIELD_VALUE = 1024;
export const MAX_EMBED_FOOTER_TEXT = 2048;

/**
 * Where a message goes. A channel id posts into a server channel; a user id
 * opens a DM first.
 *
 * Note the Discord-side constraint on DMs: a bot may only DM a user it shares
 * a guild with. For a personal site that means inviting your own bot to any
 * server you are both in, once.
 */
export type DiscordTarget =
  { kind: "channel"; channelId: string } | { kind: "dm"; userId: string };

export type DiscordEmbed = {
  title?: string;
  description?: string;
  url?: string;
  timestamp?: string;
  color?: number;
  fields?: { name: string; value: string; inline?: boolean }[];
  footer?: { text: string };
};

export type DiscordMessage = {
  content?: string;
  embeds?: DiscordEmbed[];
};

/**
 * The configured target, or null when the bot is not set up.
 *
 * Read straight off `process.env` so turbo sees the variables in its cache key
 * and the lint rule catches an undeclared one. All three MUST stay
 * non-`NEXT_PUBLIC_`: a bot token in the browser bundle is a full takeover of
 * the bot for whoever reads it.
 */
export function discordTarget(): DiscordTarget | null {
  if (!process.env.DISCORD_BOT_TOKEN) return null;
  const channelId = process.env.DISCORD_CHANNEL_ID;
  if (channelId) return { kind: "channel", channelId };
  const userId = process.env.DISCORD_DM_USER_ID;
  if (userId) return { kind: "dm", userId };
  // A token with nowhere to send is a misconfiguration, not a "disabled"
  // state, and it would otherwise look identical to one from the outside.
  captureError(
    new Error(
      "DISCORD_BOT_TOKEN is set without DISCORD_CHANNEL_ID or DISCORD_DM_USER_ID"
    ),
    { scope: "discord/config" }
  );
  return null;
}

export function isDiscordConfigured(): boolean {
  return discordTarget() !== null;
}

/** Cut a string to a Discord limit, marking the cut so a reader knows it happened. */
export function clampToLimit(value: string, max: number): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1).trimEnd()}…`;
}

// A DM channel id is stable per recipient, so resolving it once per process
// saves a round trip on every later notification.
let cachedDmChannel: { userId: string; channelId: string } | undefined;

async function resolveChannelId(
  target: DiscordTarget,
  apiBase: string,
  token: string
): Promise<string> {
  if (target.kind === "channel") return target.channelId;
  if (cachedDmChannel?.userId === target.userId) return cachedDmChannel.channelId;

  const response = await discordFetch(`${apiBase}/users/@me/channels`, token, {
    recipient_id: target.userId,
  });
  if (!response.ok) {
    throw new Error(`Discord DM channel open failed: ${response.status}`);
  }
  const channel = (await response.json()) as { id?: unknown };
  if (typeof channel.id !== "string") {
    throw new Error("Discord DM channel response had no id");
  }
  cachedDmChannel = { userId: target.userId, channelId: channel.id };
  return channel.id;
}

function discordFetch(url: string, token: string, body: unknown): Promise<Response> {
  return fetch(url, {
    method: "POST",
    headers: {
      authorization: `Bot ${token}`,
      "content-type": "application/json",
      // Discord asks bots to identify themselves and rejects some requests
      // without it. The format is theirs, not ours.
      "user-agent": "DiscordBot (https://www.nacnano.dev, 1.0)",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
}

/**
 * Send one message as the bot. Resolves either way; never throws.
 *
 * Resolves `true` only when Discord accepted the message. Callers that just
 * want the notification can ignore it (most do); a caller that remembers what
 * it has already announced needs to know the difference between "sent" and
 * "silently dropped", or a transient 429 costs it the notification for good.
 *
 * `allowed_mentions` is forced here rather than left to callers. Every message
 * this sends contains text a stranger typed, and a bot with the right
 * permission will happily ping a whole server on `@everyone`. Setting an empty
 * `parse` list means no mention in that text ever resolves, whatever a caller
 * passes — the one place it cannot be forgotten.
 */
export async function sendDiscordMessage(
  message: DiscordMessage,
  options: { apiBase?: string } = {}
): Promise<boolean> {
  const token = process.env.DISCORD_BOT_TOKEN;
  const target = discordTarget();
  if (!token || !target) return false;

  const apiBase = options.apiBase ?? DEFAULT_API_BASE;

  try {
    const channelId = await resolveChannelId(target, apiBase, token);
    const response = await discordFetch(
      `${apiBase}/channels/${channelId}/messages`,
      token,
      {
        ...message,
        allowed_mentions: { parse: [] },
      }
    );

    if (!response.ok) {
      // 429 included: the ask box is already capped at a few questions an hour,
      // so being throttled here means something else is wrong, and retrying
      // inside a serverless function would just burn the timeout.
      captureError(new Error(`Discord message failed: ${response.status}`), {
        scope: "discord/send",
        status: response.status,
      });
      return false;
    }
    return true;
  } catch (error) {
    captureError(error, { scope: "discord/send" });
    return false;
  }
}

/** Test seam. A DM channel id is cached per process; tests need a clean one. */
export function resetDiscordCache(): void {
  cachedDmChannel = undefined;
}
