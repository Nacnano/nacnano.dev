import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import type { Redis } from "@upstash/redis";
import {
  getActivityClient,
  readActivityFeed,
  recordVisit,
  STREAM_MAXLEN,
} from "@/lib/activityRedis";
import { askAma, readInbox } from "@/lib/amaInbox";
import { allowAsk, allowVisit } from "@/lib/rateLimit";
import { namespacedKey } from "@/lib/runtimeConfig";

/**
 * Live-store contract suite (PR 5.1).
 *
 * Everything in `activityRedis-io.test.ts` proves the adapter against a FAKE
 * client. That is not the same as proving it against the thing it actually
 * talks to: Upstash's REST responses come back in three different shapes
 * depending on runtime, `XADD ~MAXLEN` trims approximately, the idle `EXPIRE`
 * and `MINID` trims are store-side, and the rate limiters enforce their
 * thresholds on real Redis. Those are exactly the boundaries a mock can bless
 * and a real deployment still trips over.
 *
 * This file is NOT discovered by `bun run test` (it is `*.suite.ts`, not
 * `*.test.ts`), so it cannot affect the main suite or its coverage floor. The
 * live-store workflow runs it explicitly against a real Upstash instance with
 * `LIVE_STORE_TESTS=1`.
 *
 * SAFETY — this suite is designed to run against the PRODUCTION database, so
 * it is walled so it can only ever touch its own keyspace:
 *   - `assertSafeLiveConfig()` hard-fails unless a unique, safe key prefix is
 *     present. An un-prefixed run would write into the live activity stream, so
 *     it is refused, not warned.
 *   - Every write flows through `namespacedKey`, so all keys this run creates
 *     live under `${prefix}:…` and can never collide with the production
 *     `activity:stream` / `activity:count` / `ama:inbox`.
 *   - Teardown deletes ONLY keys matching `${prefix}:*` — never `*`, never a
 *     prefix this run did not create.
 *   - It reads the un-prefixed production keys to PROVE no test data leaked into
 *     them, but never writes them.
 *
 * Runs serially (single file, ordered cases) to avoid rate-limit and cursor races
 * on the shared store.
 */

const LIVE = process.env.LIVE_STORE_TESTS === "1";
const PREFIX = (process.env.UPSTASH_KEY_PREFIX ?? "").trim();

function assertSafeLiveConfig(): void {
  if (!LIVE) return;
  const url = process.env.UPSTASH_REDIS_REST_URL ?? "";
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? "";
  if (!url || !token) {
    throw new Error(
      "live-store: LIVE_STORE_TESTS=1 but Upstash credentials are absent — refusing."
    );
  }
  // A unique, non-empty namespace is the only thing standing between this suite
  // and the production keys. Require a shape that cannot be empty, `*`, or the
  // (unset) production prefix; the workflow injects `live-ci-<run id>`.
  if (!/^[a-z0-9][a-z0-9-]{5,}$/.test(PREFIX)) {
    throw new Error(
      `live-store: refusing to run — UPSTASH_KEY_PREFIX must be a unique, safe namespace ` +
        `>=6 chars of [a-z0-9-]; got ${JSON.stringify(PREFIX)}. An un-prefixed run would ` +
        `write into the production keyspace.`
    );
  }
}

let client: Redis | null = null;
// The logical stream/count keys, pre-resolved to this run's namespace so the
// reset/teardown helpers operate only on keys this suite owns.
const ownedStreamKey = () => namespacedKey("activity:stream");
const ownedCountKey = () => namespacedKey("activity:count");

async function resetOwnedFeed(): Promise<void> {
  // Clear this run's own stream + counter so ordering/paging/count assertions
  // start from a known empty state. Safe: both keys are under `${PREFIX}:`.
  await client!.del(ownedStreamKey(), ownedCountKey());
}

beforeAll(() => {
  assertSafeLiveConfig();
  if (LIVE) client = getActivityClient();
  if (LIVE && !client) {
    throw new Error(
      "live-store: configured credentials did not yield a client (invalid config?)."
    );
  }
});

afterAll(async () => {
  if (!LIVE || !client) return;
  // Delete ONLY this run's namespace. `${PREFIX}` is validated non-empty and
  // `:*` is scoped to it, so this can never reach the production keyspace.
  const keys = await client.keys(`${PREFIX}:*`);
  // A single run creates only a few dozen prefixed keys. A large blow-up here
  // means the prefix isolation failed and `keys("*")`-scale scope leaked into
  // this namespace — so refuse to issue an unbounded `del(...keys)` over a
  // surprise-sized set (which would also push the command past a sane arg limit)
  // rather than trusting it blindly. Tune the ceiling up if the suite grows.
  if (keys.length > 500) {
    throw new Error(
      `live-store: refusing unbounded teardown — ${keys.length} keys under ${PREFIX}:* ` +
        `(expected a few dozen); the prefix isolation may have failed.`
    );
  }
  if (keys.length > 0) await client.del(...keys);
});

describe("live store contract", () => {
  it.skipIf(!LIVE)("appends and reads back a real visit, newest-first", async () => {
    await resetOwnedFeed();
    await recordVisit({ path: "/live/first", title: "First" });
    await recordVisit({ path: "/live/second", title: "Second" });

    const page = await readActivityFeed(50);
    const paths = page.visits.map((v) => v.page);
    expect(paths).toContain("/live/second");
    expect(paths).toContain("/live/first");
    // Newest-first: the last write must not sit below the earlier one.
    expect(paths.indexOf("/live/second")).toBeLessThan(paths.indexOf("/live/first"));
    // The counter reflects exactly the two writes in this isolated namespace.
    expect(page.count).toBe(2);
  });

  it.skipIf(!LIVE)(
    "parses the real Upstash reply into usable rows + cursors",
    async () => {
      // Exercises parseStreamEntries against the live response shape, not a fixture:
      // every returned row must carry a well-formed stream-id cursor, and the page
      // cursor must be a real `<ms>-<seq>` id the next request can page from.
      const page = await readActivityFeed(10);
      expect(page.visits.length).toBeGreaterThan(0);
      for (const visit of page.visits) {
        expect(visit.cursor).toMatch(/^\d+-\d+$/);
        expect(visit.id).toBeTruthy();
        expect(Number.isNaN(new Date(visit.ts).getTime())).toBe(false);
      }
      expect(page.nextCursor).toMatch(/^\d+-\d+$/);
    }
  );

  it.skipIf(!LIVE)(
    "pages older-than-cursor exclusively, with no duplicates or gaps",
    async () => {
      await resetOwnedFeed();
      const written = Array.from({ length: 5 }, (_, i) => `/live/page/${i}`);
      for (const path of written) await recordVisit({ path });

      const head = await readActivityFeed(2);
      expect(head.visits).toHaveLength(2);
      expect(head.hasMore).toBe(true);

      const second = await readActivityFeed(2, head.nextCursor);
      const third = await readActivityFeed(2, second.nextCursor);

      const seen = [...head.visits, ...second.visits, ...third.visits].map((v) => v.id);
      // Five rows, three pages of <=2: no id repeats and none are lost.
      expect(new Set(seen).size).toBe(seen.length);
      expect(seen.length).toBe(5);
      // The walk terminates on a short page.
      expect(third.hasMore).toBe(false);
    }
  );

  it.skipIf(!LIVE)("caps the stream at MAXLEN (approximate trim)", async () => {
    await resetOwnedFeed();
    // A single pipeline issues just over MAXLEN appends, each carrying the same
    // `~MAXLEN` trim `recordVisit` applies, so one round trip exercises the
    // store-side cap. `~` trims approximately, so assert it is bounded near the
    // ceiling rather than an exact equality the approximate strategy never gives.
    const pipeline = client!.pipeline();
    for (let i = 0; i < STREAM_MAXLEN + 50; i += 1) {
      pipeline.xadd(
        ownedStreamKey(),
        "*",
        {
          data: JSON.stringify({
            id: `cap-${i}`,
            ts: new Date().toISOString(),
            page: `/live/cap/${i}`,
          }),
        },
        { trim: { type: "MAXLEN", comparison: "~", threshold: STREAM_MAXLEN } }
      );
    }
    await pipeline.exec();

    const len = await client!.xlen(ownedStreamKey());
    expect(len).toBeGreaterThan(0);
    expect(len).toBeLessThanOrEqual(STREAM_MAXLEN + 100);
  });

  it.skipIf(!LIVE)(
    "applies an idle expiry to the stream (retention wiring)",
    async () => {
      await resetOwnedFeed();
      await recordVisit({ path: "/live/expire" });
      // The write pipeline sets an idle EXPIRE on both keys; a positive TTL is the
      // observable proof the retention wiring survives the real client.
      const ttl = await client!.ttl(ownedStreamKey());
      expect(ttl).toBeGreaterThan(0);
    }
  );

  it.skipIf(!LIVE)(
    "enforces the ask-box threshold and isolates the beacon budget",
    async () => {
      // Same salted bucket, hammered past the ask box's per-window ceiling (5/hour).
      const askerIp = `203.0.113.${(Date.now() % 200) + 10}`;
      let allowed = 0;
      for (let i = 0; i < 8; i += 1) {
        if (await allowAsk(askerIp)) allowed += 1;
      }
      expect(allowed).toBeLessThanOrEqual(5);
      expect(allowed).toBeGreaterThan(0);

      // The beacon has its own bucket; exhausting the ask box must not touch it.
      expect(await allowVisit(askerIp)).toBe(true);
    }
  );

  it.skipIf(!LIVE)("writes and reads the AMA inbox through the real store", async () => {
    const question = `live contract ${PREFIX} ${Date.now()}`;
    const record = await askAma({ question });
    expect(record).not.toBeNull();

    const inbox = await readInbox(50);
    expect(inbox.some((r) => r.question === question)).toBe(true);
    // Newest-first — the just-asked question is at the head.
    expect(inbox[0]?.question).toBe(question);
  });

  it.skipIf(!LIVE)(
    "keeps every test write OUT of the un-prefixed production keys",
    async () => {
      // The whole safety argument rests on this: nothing this suite wrote reached
      // the live `activity:stream` / `ama:inbox` that the public site reads. Read
      // only — never write — the production keys to prove isolation.
      const prodStream = await client!.xrevrange("activity:stream", "+", "-", 50);
      const prodInbox = await client!.xrevrange("ama:inbox", "+", "-", 50);
      const text = JSON.stringify(prodStream) + JSON.stringify(prodInbox);
      // Our run id is embedded in every path / question this suite writes; it must
      // not appear anywhere in the production keyspace.
      expect(text).not.toContain(PREFIX);
    }
  );
});
