import { describe, it, expect } from "bun:test";
import type { Redis } from "@upstash/redis";
import {
  askAma,
  isInboxLive,
  readInbox,
  RETENTION_SECONDS,
  type AskRecord,
} from "./amaInbox";
import { resetRuntimeConfigCache } from "./runtimeConfig";

/**
 * The store half of the /ama inbox — the half `amaInbox.test.ts` deliberately
 * does not reach, because it takes its collaborators as parameters rather than
 * importing them.
 *
 * `askAma` and `readInbox` take the Redis client the same way, so the write
 * shape (one pipeline: append, age trim, idle expiry) and the read shape (every
 * reply form Upstash hands back, plus the rows that must be dropped) are
 * asserted against a fake with no network and no `mock.module` — which in bun is
 * process-global and would clobber the fake `activityRedis-io.test.ts` installs.
 */

type PipeCall = { cmd: string; args: unknown[] };

function fakeStore(reply: unknown = {}) {
  const calls: PipeCall[] = [];
  const log =
    (cmd: string) =>
    (...args: unknown[]) => {
      calls.push({ cmd, args });
    };

  const client = {
    pipeline() {
      const self: Record<string, unknown> = {};
      const chain =
        (cmd: string) =>
        (...args: unknown[]) => {
          log(cmd)(...args);
          return self;
        };
      self.xadd = chain("xadd");
      self.xtrim = chain("xtrim");
      self.expire = chain("expire");
      self.exec = async () => [];
      return self;
    },
    async xrevrange(...args: unknown[]) {
      log("xrevrange")(...args);
      return reply;
    },
  };

  return { client: client as unknown as Redis, calls };
}

describe("askAma", () => {
  it("writes one pipelined batch: append + age trim + idle expiry", async () => {
    const { client, calls } = fakeStore();
    const before = Date.now();

    const record = await askAma(
      { question: "Why zinc?", contact: "a@b.example" },
      client
    );
    const after = Date.now();

    expect(record).not.toBeNull();
    expect(calls.map((c) => c.cmd)).toEqual(["xadd", "xtrim", "expire"]);

    const xadd = calls[0]!;
    expect(xadd.args[0]).toBe("ama:inbox");
    expect(xadd.args[1]).toBe("*");
    expect(xadd.args[3]).toEqual({
      trim: { type: "MAXLEN", comparison: "~", threshold: 500 },
    });

    // The record that comes back is the one that went in — the notifier reuses
    // it rather than rebuilding (and re-timestamping) the question.
    const stored = JSON.parse((xadd.args[2] as { data: string }).data);
    expect(stored).toEqual(record as unknown as Record<string, unknown>);
    expect(stored.question).toBe("Why zinc?");
    expect(stored.contact).toBe("a@b.example");
    expect(Date.parse(stored.ts)).toBeGreaterThanOrEqual(before);

    // MINID threshold is a stream id one retention window behind now.
    const trim = calls[1]!.args[1] as { strategy: string; threshold: string };
    expect(trim.strategy).toBe("MINID");
    const cutoff = Number(trim.threshold.split("-")[0]);
    expect(cutoff).toBeGreaterThanOrEqual(before - RETENTION_SECONDS * 1000);
    expect(cutoff).toBeLessThanOrEqual(after - RETENTION_SECONDS * 1000);

    expect(calls[2]!.args).toEqual(["ama:inbox", RETENTION_SECONDS]);
  });

  it("stores nothing and reports null in static mode", async () => {
    expect(await askAma({ question: "Anyone home?" }, null)).toBeNull();
  });
});

describe("readInbox", () => {
  it("reads newest-first through the shared stream parser", async () => {
    const newer: AskRecord = {
      id: "2",
      ts: "2026-09-14T02:00:00.000Z",
      question: "second",
    };
    const older: AskRecord = {
      id: "1",
      ts: "2026-09-14T01:00:00.000Z",
      question: "first",
      contact: "someone",
    };
    // Upstash's deserializer JSON.parses field values, so `data` normally
    // arrives already an object; the raw-string form is handled too.
    const { client, calls } = fakeStore({
      "1700000002000-0": { data: newer },
      "1700000001000-0": { data: JSON.stringify(older) },
    });

    expect(await readInbox(10, client)).toEqual([newer, older]);
    expect(calls[0]!.args).toEqual(["ama:inbox", "+", "-", 10]);
  });

  it("drops unparseable and non-record rows rather than surfacing them", async () => {
    const good: AskRecord = { id: "1", ts: "2026-09-14T01:00:00.000Z", question: "ok" };
    const { client } = fakeStore({
      "4-0": { data: good },
      "3-0": { data: "{not json" },
      "2-0": { data: { id: "x", ts: "2026-09-14T02:00:00.000Z" } }, // no question
      "1-0": { data: null },
    });

    expect(await readInbox(50, client)).toEqual([good]);
  });

  it("is empty in static mode, never an error", async () => {
    expect(await readInbox(50, null)).toEqual([]);
  });
});

describe("isInboxLive", () => {
  it("is the store gate and nothing more", () => {
    expect(isInboxLive(null)).toBe(false);
    expect(isInboxLive(fakeStore().client)).toBe(true);
  });
});

describe("key namespacing", () => {
  // `UPSTASH_KEY_PREFIX` must namespace the inbox too, not just the activity
  // stream and rate-limit buckets — otherwise two prefixed workspaces sharing
  // one instance collide on one inbox and its 500-entry cap. Production sets no
  // prefix, so the resolved key stays byte-identical to `ama:inbox`.
  const PREFIX = "ws-42";
  const SALT = "namespacing-test-salt-with-at-least-32-characters-of-entropy";
  function withPrefix(run: () => void) {
    const had = {
      UPSTASH_KEY_PREFIX: process.env.UPSTASH_KEY_PREFIX,
      UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
      UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
      VISIT_IP_SALT: process.env.VISIT_IP_SALT,
    };
    process.env.UPSTASH_KEY_PREFIX = PREFIX;
    process.env.UPSTASH_REDIS_REST_URL = "https://fake.upstash.example";
    process.env.UPSTASH_REDIS_REST_TOKEN = "fake-token";
    process.env.VISIT_IP_SALT = SALT;
    resetRuntimeConfigCache();
    try {
      run();
    } finally {
      for (const [key, value] of Object.entries(had)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
      resetRuntimeConfigCache();
    }
  }

  it("writes to the prefixed key when a prefix is configured", async () => {
    const { client, calls } = fakeStore();
    withPrefix(() => {
      void askAma({ question: "Why zinc?" }, client);
    });
    const xadd = calls.find((c) => c.cmd === "xadd");
    expect(xadd?.args[0]).toBe(`${PREFIX}:ama:inbox`);
  });

  it("reads from the prefixed key when a prefix is configured", async () => {
    const { client, calls } = fakeStore({});
    withPrefix(() => {
      void readInbox(10, client);
    });
    const read = calls.find((c) => c.cmd === "xrevrange");
    expect(read?.args[0]).toBe(`${PREFIX}:ama:inbox`);
  });
});
