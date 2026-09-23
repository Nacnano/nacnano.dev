/**
 * Send the daily activity summary from the terminal: `bun run activity:report`.
 *
 * The same message Vercel Cron posts on its schedule — this is the manual
 * path: to verify the bot setup before waiting for the first scheduled run,
 * to see today's numbers on demand, or to replace the cron entirely for
 * anyone who prefers their own scheduler (point it at
 * `GET /api/cron/daily-report` with the bearer secret instead).
 *
 * Needs the same environment the live site uses — Upstash credentials for the
 * data, the Discord bot variables for delivery — and loads `.env.local` the
 * way Bun does from the app directory.
 */

import { sendDailyActivityReport } from "../lib/activityReport";

const outcome = await sendDailyActivityReport();

if (!outcome.sent && outcome.skipped === "no_discord") {
  console.log(
    "Discord bot is not configured — set DISCORD_BOT_TOKEN plus DISCORD_CHANNEL_ID " +
      "(or DISCORD_DM_USER_ID). `bun run discord:setup` checks them."
  );
} else if (!outcome.sent && outcome.skipped === "no_store") {
  console.log(
    "Static mode — no UPSTASH_REDIS_REST_* credentials here, so there is no " +
      "activity to report."
  );
} else if (!outcome.sent) {
  // send_failed: Discord refused it. `sendDiscordMessage` already reported the
  // status; this path just gives the CLI a non-zero exit.
  console.error("Discord refused the report (see the server log / error alerts).");
  process.exitCode = 1;
} else {
  const { summary } = outcome;
  console.log(`Daily activity report sent — ${summary.to} window.`);
  console.log(`  visits:    ${summary.visits}`);
  console.log(`  countries: ${summary.countries}`);
  for (const page of summary.top) {
    console.log(`  ${page.count}× ${page.page}${page.title ? ` (${page.title})` : ""}`);
  }
  console.log(`  total:     ${summary.total}`);
}
