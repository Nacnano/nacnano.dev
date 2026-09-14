/**
 * Read the /ama inbox from the terminal: `bun run ama:inbox`.
 *
 * The moderation step, and the only reader of the stream — no route and no page
 * ever reads it back, which is what keeps an anonymous public write from
 * reaching the site. Answer what deserves an answer, write it into
 * `src/data/amaData.ts`, and let the rest expire on its own.
 *
 * Needs the same `UPSTASH_REDIS_REST_URL` / `_TOKEN` the site uses; run it with
 * `.env.local` loaded (Bun does that automatically from the app directory).
 */

import { readInbox, RETENTION_DAYS } from "../lib/amaInbox";

async function main() {
  const limit = Number(process.argv[2] ?? 50);
  const records = await readInbox(Number.isFinite(limit) ? limit : 50);

  if (records.length === 0) {
    console.log(
      "Inbox empty (or no Upstash credentials in this environment — questions are kept for " +
        `${RETENTION_DAYS} days).`
    );
    return;
  }

  for (const record of records) {
    console.log(`\n${record.ts}  ${record.id}`);
    if (record.contact) console.log(`from: ${record.contact}`);
    console.log(record.question);
  }
  console.log(`\n${records.length} question(s), newest first.`);
}

await main();
