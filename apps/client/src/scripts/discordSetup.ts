/**
 * Set up and check the /ama Discord bot: `bun run discord:setup`.
 *
 * Two steps of the setup need a browser signed in as you and cannot be
 * automated: creating the application and clicking the invite. Everything else
 * is here. Run it after pasting a token into `.env.local` and it will validate
 * the token, print the exact invite URL for your application, show which
 * servers the bot is in (the prerequisite for DMs), and send a real test
 * message down the same code path a question uses.
 *
 * It never prints the token, only what can be derived from it.
 *
 * `--api-base <url>` points the calls somewhere other than Discord. That is a
 * testing seam for this script only; the runtime deliberately has no such
 * override, because an env-controlled API origin is an exfiltration path for
 * the token.
 */

import { sendDiscordMessage, discordTarget } from "../lib/discord";

const DEFAULT_API_BASE = "https://discord.com/api/v10";

// View Channel (1<<10) + Send Messages (1<<11) + Embed Links (1<<14).
// Embed Links is not optional: the notification is embed-only, so without it
// the bot posts an empty message or is refused outright.
const CHANNEL_PERMISSIONS = 1024 + 2048 + 16384;

type Bot = { id: string; username: string };
type Guild = { id: string; name: string };

function apiBaseFromArgv(): string {
  const index = process.argv.indexOf("--api-base");
  return index === -1 ? DEFAULT_API_BASE : (process.argv[index + 1] ?? DEFAULT_API_BASE);
}

async function get<T>(path: string, token: string, apiBase: string): Promise<T> {
  const response = await fetch(`${apiBase}${path}`, {
    headers: {
      authorization: `Bot ${token}`,
      "user-agent": "DiscordBot (https://www.nacnano.dev, 1.0)",
    },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    throw new Error(
      `GET ${path} → ${response.status} ${explain(response.status)}`.trim()
    );
  }
  return (await response.json()) as T;
}

/**
 * Only the meanings that hold for the read calls this script makes. The
 * channel-and-permission readings of 403/404 belong to the *send* path, and
 * saying "check DISCORD_CHANNEL_ID" after a failed `GET /users/@me` sends
 * someone to inspect a variable that had nothing to do with it.
 */
function explain(status: number): string {
  if (status === 401) return "(bad or reset token — copy it again from the Bot tab)";
  if (status === 429) return "(rate limited by Discord; wait a minute)";
  return "";
}

function missingToken(): void {
  console.log(`No DISCORD_BOT_TOKEN found.

  1. Open https://discord.com/developers/applications and create an application
  2. Bot tab → Reset Token → copy it
  3. Put it in apps/client/.env.local as DISCORD_BOT_TOKEN=...
  4. Run this again

No privileged gateway intents are needed: this bot posts, it never reads.`);
}

async function main() {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) {
    missingToken();
    return;
  }

  const apiBase = apiBaseFromArgv();

  // The first call doubles as token validation: a bad token is a 401 here
  // rather than a silently missing notification three weeks from now.
  const bot = await get<Bot>("/users/@me", token, apiBase);
  console.log(`Bot:     ${bot.username} (${bot.id})\n`);

  const guilds = await get<Guild[]>("/users/@me/guilds", token, apiBase);
  if (guilds.length === 0) {
    console.log("Servers: none yet\n");
  } else {
    console.log("Servers:");
    for (const guild of guilds) console.log(`  - ${guild.name}`);
    console.log();
  }

  const invite = (permissions: number) =>
    `https://discord.com/oauth2/authorize?client_id=${bot.id}&scope=bot&permissions=${permissions}`;

  if (!process.env.DISCORD_CHANNEL_ID && !process.env.DISCORD_DM_USER_ID) {
    console.log(`Set a destination in .env.local, then run this again.

  DM (recommended — reaches your phone, nobody else sees the questions)
    Discord only lets a bot DM someone it shares a server with, so invite it:
      ${invite(0)}
    Then Settings → Advanced → Developer Mode, right-click your own name →
    Copy User ID, and set:
      DISCORD_DM_USER_ID=...

  Channel
    Invite with the permissions it needs to post an embed:
      ${invite(CHANNEL_PERMISSIONS)}
    Right-click the channel → Copy Channel ID, and set:
      DISCORD_CHANNEL_ID=...`);
    return;
  }

  const target = discordTarget();
  if (!target) return;

  if (target.kind === "dm" && guilds.length === 0) {
    console.log(`The bot is in no servers, so Discord will refuse the DM.
Invite it to any server you are also in, then run this again:
  ${invite(0)}`);
    return;
  }

  const destination =
    target.kind === "dm"
      ? `a DM to user ${target.userId}`
      : `channel ${target.channelId}`;
  console.log(`Sending a test message to ${destination}...`);

  // Deliberately the same function the notifier calls, so a pass here means
  // the real path works, not that a parallel one does.
  await sendDiscordMessage(
    {
      embeds: [
        {
          title: "Test from /ama setup",
          description:
            "If you can read this, new questions will arrive here. Nothing was written to the inbox.",
          color: 0x2556da,
          timestamp: new Date().toISOString(),
        },
      ],
    },
    { apiBase }
  );

  console.log(`Sent. If nothing arrives, the reason was logged above as
[error] {"scope":"discord/send",...} with the status code.`);
}

try {
  await main();
} catch (error) {
  console.error(`\n${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
