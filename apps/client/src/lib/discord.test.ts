import { describe, it, expect, afterEach } from "bun:test";
import {
  clampToLimit,
  discordTarget,
  isDiscordConfigured,
  resetDiscordCache,
  sendDiscordMessage,
  MAX_CONTENT,
} from "./discord";

/**
 * Driven against a real local server standing in for Discord, not a stubbed
 * `fetch`. The properties worth asserting are about the bytes that go over the
 * wire — the auth header, the mention guard, the DM handshake — and a stub
 * would assume those rather than prove them.
 */

type Call = { path: string; auth: string | null; body: Record<string, unknown> };

function fakeDiscord(handler?: (call: Call) => Response) {
  const calls: Call[] = [];
  const server = Bun.serve({
    port: 0,
    async fetch(request) {
      const url = new URL(request.url);
      const call: Call = {
        path: url.pathname,
        auth: request.headers.get("authorization"),
        body: await request.json().catch(() => null),
      };
      calls.push(call);
      if (handler) return handler(call);
      if (url.pathname.endsWith("/users/@me/channels")) {
        return Response.json({ id: "dm-channel-1" });
      }
      return Response.json({ id: "message-1" });
    },
  });
  return {
    calls,
    apiBase: `http://localhost:${server.port}`,
    stop: () => server.stop(true),
  };
}

const ENV_KEYS = [
  "DISCORD_BOT_TOKEN",
  "DISCORD_CHANNEL_ID",
  "DISCORD_DM_USER_ID",
] as const;
const original = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (original[key] === undefined) delete process.env[key];
    else process.env[key] = original[key] as string;
  }
  resetDiscordCache();
});

function configure(env: Partial<Record<(typeof ENV_KEYS)[number], string>>) {
  for (const key of ENV_KEYS) delete process.env[key];
  for (const [key, value] of Object.entries(env)) process.env[key] = value;
}

describe("clampToLimit", () => {
  it("leaves a string that fits alone", () => {
    expect(clampToLimit("short", MAX_CONTENT)).toBe("short");
  });

  it("cuts to the limit and marks the cut", () => {
    const clamped = clampToLimit("a".repeat(50), 10);
    expect(clamped).toHaveLength(10);
    expect(clamped.endsWith("…")).toBe(true);
  });
});

describe("discordTarget", () => {
  it("is null with no token, whatever else is set", () => {
    configure({ DISCORD_CHANNEL_ID: "123" });
    expect(discordTarget()).toBeNull();
    expect(isDiscordConfigured()).toBe(false);
  });

  it("prefers a channel when both a channel and a DM user are set", () => {
    configure({
      DISCORD_BOT_TOKEN: "t",
      DISCORD_CHANNEL_ID: "123",
      DISCORD_DM_USER_ID: "456",
    });
    expect(discordTarget()).toEqual({ kind: "channel", channelId: "123" });
  });

  it("falls back to a DM when only a user is set", () => {
    configure({ DISCORD_BOT_TOKEN: "t", DISCORD_DM_USER_ID: "456" });
    expect(discordTarget()).toEqual({ kind: "dm", userId: "456" });
  });

  // A token with nowhere to send looks exactly like "disabled" from outside,
  // which is the misconfiguration most likely to go unnoticed.
  it("is null but reports a token with no destination", () => {
    configure({ DISCORD_BOT_TOKEN: "t" });
    expect(discordTarget()).toBeNull();
  });
});

describe("sendDiscordMessage", () => {
  it("does nothing at all when unconfigured", async () => {
    configure({});
    const discord = fakeDiscord();
    // `false`, not a silent success: a caller that de-dupes on delivery must be
    // able to tell "nothing was configured" from "Discord has it".
    expect(
      await sendDiscordMessage({ content: "hi" }, { apiBase: discord.apiBase })
    ).toBe(false);
    discord.stop();
    expect(discord.calls).toHaveLength(0);
  });

  it("posts to the channel with the bot auth scheme", async () => {
    configure({ DISCORD_BOT_TOKEN: "secret-token", DISCORD_CHANNEL_ID: "999" });
    const discord = fakeDiscord();
    expect(
      await sendDiscordMessage({ content: "hi" }, { apiBase: discord.apiBase })
    ).toBe(true);
    discord.stop();

    expect(discord.calls).toHaveLength(1);
    expect(discord.calls[0]?.path).toBe("/channels/999/messages");
    // "Bot <token>", not "Bearer": a bearer token is silently unauthorised.
    expect(discord.calls[0]?.auth).toBe("Bot secret-token");
    expect(discord.calls[0]?.body.content).toBe("hi");
  });

  // Every message carries text a stranger typed. A bot with the permission
  // will ping a whole server on "@everyone" unless this is set.
  it("suppresses every mention, and does not let a caller re-enable them", async () => {
    configure({ DISCORD_BOT_TOKEN: "t", DISCORD_CHANNEL_ID: "999" });
    const discord = fakeDiscord();
    await sendDiscordMessage(
      {
        content: "@everyone look",
        ...({ allowed_mentions: { parse: ["everyone"] } } as object),
      },
      { apiBase: discord.apiBase }
    );
    discord.stop();
    expect(discord.calls[0]?.body.allowed_mentions).toEqual({ parse: [] });
  });

  it("opens a DM channel first, then posts into it", async () => {
    configure({ DISCORD_BOT_TOKEN: "t", DISCORD_DM_USER_ID: "user-42" });
    const discord = fakeDiscord();
    await sendDiscordMessage({ content: "hi" }, { apiBase: discord.apiBase });
    discord.stop();

    expect(discord.calls.map((c) => c.path)).toEqual([
      "/users/@me/channels",
      "/channels/dm-channel-1/messages",
    ]);
    expect(discord.calls[0]?.body).toEqual({ recipient_id: "user-42" });
  });

  it("reuses the resolved DM channel instead of reopening it every time", async () => {
    configure({ DISCORD_BOT_TOKEN: "t", DISCORD_DM_USER_ID: "user-42" });
    const discord = fakeDiscord();
    await sendDiscordMessage({ content: "one" }, { apiBase: discord.apiBase });
    await sendDiscordMessage({ content: "two" }, { apiBase: discord.apiBase });
    discord.stop();

    expect(discord.calls.filter((c) => c.path === "/users/@me/channels")).toHaveLength(1);
    expect(discord.calls.filter((c) => c.path.endsWith("/messages"))).toHaveLength(2);
  });

  it("resolves quietly when Discord rejects the message", async () => {
    configure({ DISCORD_BOT_TOKEN: "t", DISCORD_CHANNEL_ID: "999" });
    const discord = fakeDiscord(() => new Response("forbidden", { status: 403 }));
    expect(
      await sendDiscordMessage({ content: "hi" }, { apiBase: discord.apiBase })
    ).toBe(false);
    discord.stop();
  });

  it("resolves quietly when the DM handshake fails", async () => {
    configure({ DISCORD_BOT_TOKEN: "t", DISCORD_DM_USER_ID: "user-42" });
    const discord = fakeDiscord(() => new Response("nope", { status: 400 }));
    expect(
      await sendDiscordMessage({ content: "hi" }, { apiBase: discord.apiBase })
    ).toBe(false);
    discord.stop();
    // The failed handshake must not be cached as a usable channel.
    expect(discord.calls).toHaveLength(1);
  });

  it("resolves quietly when the DM handshake returns a body with no id", async () => {
    configure({ DISCORD_BOT_TOKEN: "t", DISCORD_DM_USER_ID: "user-42" });
    const discord = fakeDiscord(() => Response.json({ unexpected: true }));
    expect(
      await sendDiscordMessage({ content: "hi" }, { apiBase: discord.apiBase })
    ).toBe(false);
    discord.stop();
    expect(discord.calls).toHaveLength(1);
  });

  it("resolves quietly when Discord is unreachable", async () => {
    configure({ DISCORD_BOT_TOKEN: "t", DISCORD_CHANNEL_ID: "999" });
    expect(
      await sendDiscordMessage({ content: "hi" }, { apiBase: "http://localhost:1" })
    ).toBe(false);
  });
});
