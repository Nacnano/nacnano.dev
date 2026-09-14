import { describe, it, expect } from "bun:test";
import {
  askRecord,
  normaliseAsk,
  submitAsk,
  MAX_CONTACT,
  MAX_QUESTION,
  RETENTION_DAYS,
  type AskDeps,
  type AskInput,
  type AskRecord,
} from "./amaInbox";

/**
 * The write side of /ama. Unlike the activity routes, nothing here needs
 * `mock.module`: `submitAsk` takes its store, limiter and error sink as
 * parameters, so the ordering that actually matters — throttle first, honeypot
 * before storing, bounds before the network — is asserted with plain fakes.
 */

function deps(overrides: Partial<AskDeps> = {}) {
  const stored: AskInput[] = [];
  const notified: AskRecord[] = [];
  const errors: unknown[] = [];
  const base: AskDeps = {
    isLive: () => true,
    allow: async () => true,
    store: async (input) => {
      stored.push(input);
      return askRecord(input);
    },
    notify: (record) => notified.push(record),
    onError: (error) => errors.push(error),
  };
  return { deps: { ...base, ...overrides }, stored, notified, errors };
}

describe("normaliseAsk", () => {
  it("trims and keeps a real question", () => {
    const result = normaliseAsk({ question: "  Why zinc?  " });
    expect(result).toEqual({
      ok: true,
      value: { question: "Why zinc?", contact: undefined },
    });
  });

  it("rejects whitespace-only as empty", () => {
    expect(normaliseAsk({ question: "   \n\t " })).toEqual({
      ok: false,
      reason: "empty",
    });
  });

  it("measures length after trimming, so padding is not a rejection", () => {
    const padded = `  ${"a".repeat(MAX_QUESTION)}  `;
    expect(normaliseAsk({ question: padded }).ok).toBe(true);
    expect(normaliseAsk({ question: "a".repeat(MAX_QUESTION + 1) })).toEqual({
      ok: false,
      reason: "too_long",
    });
  });

  it("bounds the optional contact and drops a blank one", () => {
    expect(normaliseAsk({ question: "hi", contact: "   " })).toEqual({
      ok: true,
      value: { question: "hi", contact: undefined },
    });
    expect(
      normaliseAsk({ question: "hi", contact: "x".repeat(MAX_CONTACT + 1) })
    ).toEqual({
      ok: false,
      reason: "contact_too_long",
    });
  });
});

describe("submitAsk", () => {
  it("stores a valid question and reports it sent", async () => {
    const { deps: d, stored } = deps();
    expect(await submitAsk({ question: "Why zinc?" }, d)).toEqual({ status: "sent" });
    expect(stored).toEqual([{ question: "Why zinc?", contact: undefined }]);
  });

  it("notifies with the stored record, once, after storing", async () => {
    const { deps: d, notified } = deps();
    await submitAsk({ question: "Why zinc?", contact: "a@b.c" }, d);
    expect(notified).toHaveLength(1);
    expect(notified[0]?.question).toBe("Why zinc?");
    expect(notified[0]?.contact).toBe("a@b.c");
  });

  it("says so honestly when there is no store configured", async () => {
    const { deps: d, stored } = deps({ isLive: () => false });
    expect(await submitAsk({ question: "Why zinc?" }, d)).toEqual({
      status: "error",
      reason: "unavailable",
    });
    expect(stored).toHaveLength(0);
  });

  // Throttling before the body is read is the whole point of the ordering: a
  // malformed flood must cost the same as a well-formed one.
  it("throttles before validating or storing", async () => {
    const { deps: d, stored } = deps({ allow: async () => false });
    expect(await submitAsk({ question: "" }, d)).toEqual({
      status: "error",
      reason: "rate_limited",
    });
    expect(stored).toHaveLength(0);
  });

  it("swallows a honeypot hit without storing it, and tells the bot nothing", async () => {
    const { deps: d, stored } = deps();
    expect(await submitAsk({ question: "Why zinc?", honeypot: "http://x" }, d)).toEqual({
      status: "sent",
    });
    expect(stored).toHaveLength(0);
  });

  it("passes a rejection reason straight through", async () => {
    const { deps: d } = deps();
    expect(await submitAsk({ question: "  " }, d)).toEqual({
      status: "error",
      reason: "empty",
    });
    expect(await submitAsk({ question: "a".repeat(MAX_QUESTION + 1) }, d)).toEqual({
      status: "error",
      reason: "too_long",
    });
  });

  it("reports a store failure to the asker instead of a false success", async () => {
    const boom = new Error("upstash down");
    const { deps: d, errors } = deps({
      store: async () => {
        throw boom;
      },
    });
    expect(await submitAsk({ question: "Why zinc?" }, d)).toEqual({
      status: "error",
      reason: "failed",
    });
    expect(errors).toEqual([boom]);
  });

  it("does not claim success when the store declines the write", async () => {
    const { deps: d } = deps({ store: async () => null });
    expect(await submitAsk({ question: "Why zinc?" }, d)).toEqual({
      status: "error",
      reason: "unavailable",
    });
  });

  // The question is in Redis by the time the notifier runs. Telling the asker
  // it failed because the author's webhook is down would be a lie, and one
  // that invites them to send the same question again.
  it("still reports sent when the notifier throws", async () => {
    const boom = new Error("webhook down");
    const { deps: d, errors } = deps({
      notify: () => {
        throw boom;
      },
    });
    expect(await submitAsk({ question: "Why zinc?" }, d)).toEqual({ status: "sent" });
    expect(errors).toEqual([boom]);
  });

  it("does not notify for a question it never stored", async () => {
    const cases: Array<Partial<AskDeps>> = [
      { isLive: () => false },
      { allow: async () => false },
      { store: async () => null },
    ];
    for (const override of cases) {
      const { deps: d, notified } = deps(override);
      await submitAsk({ question: "Why zinc?" }, d);
      expect(notified).toHaveLength(0);
    }

    // ...including the honeypot, which is answered with a success on purpose.
    const { deps: d, notified } = deps();
    await submitAsk({ question: "Why zinc?", honeypot: "http://x" }, d);
    expect(notified).toHaveLength(0);
  });
});

describe("askRecord", () => {
  it("stamps an id and time and carries only what was submitted", () => {
    const record = askRecord({ question: "Why zinc?", contact: "a@b.c" });
    expect(record.question).toBe("Why zinc?");
    expect(record.contact).toBe("a@b.c");
    expect(record.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(new Date(record.ts).toISOString()).toBe(record.ts);
  });
});

describe("retention", () => {
  // The page states this number to the asker; it must come from the store's own
  // constant, or the promise on the page can drift from what Redis is keeping.
  it("advertises the same window the stream is trimmed to", () => {
    expect(RETENTION_DAYS).toBe(90);
  });
});
