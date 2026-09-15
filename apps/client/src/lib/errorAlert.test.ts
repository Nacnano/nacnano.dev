import { afterAll, beforeEach, describe, expect, it, mock } from "bun:test";

/**
 * Unit-tests the Discord error sink in isolation: `discord.ts` is mocked (it is
 * server-only and owns the transport, and `sendDiscordMessage` takes no injectable
 * base URL so the wire-level fake the discord suite uses can't intercept it here).
 * What this asserts is the *policy* that lives in `errorAlert` — windowed de-dup
 * per signature, the per-window budgets, never reporting the transport's own
 * failures, and the embed shape.
 */
import * as discord from "./discord";
const discordReal = { ...discord };

type Sent = {
  embeds?: {
    title?: string;
    description?: string;
    color?: number;
    fields?: { name: string; value: string }[];
    footer?: { text: string };
  }[];
};
let sent: Sent[] = [];
// Whether the faked transport claims Discord accepted the message. Flipping it
// to `false` is how the "a dropped send must not burn the alert" case is driven.
let delivers = true;

mock.module("./discord", () => ({
  ...discordReal,
  sendDiscordMessage: (message: Sent) => {
    sent.push(message);
    return Promise.resolve(delivers);
  },
}));

import { reportErrorToDiscord, resetErrorAlertCacheForTests } from "./errorAlert";

/** The send is fire-and-forget; let its `.then` settle before asserting. */
function flush(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

beforeEach(() => {
  sent = [];
  delivers = true;
  resetErrorAlertCacheForTests();
});

afterAll(() => {
  mock.module("./discord", () => discordReal);
});

describe("reportErrorToDiscord", () => {
  it("sends an error embed once, describing the scope and message", () => {
    reportErrorToDiscord({ name: "TypeError", message: "boom", scope: "activity-feed" });
    expect(sent).toHaveLength(1);
    const embed = sent[0]?.embeds?.[0];
    expect(embed?.title).toContain("activity-feed");
    expect(embed?.description).toContain("TypeError: boom");
  });

  it("de-dupes a persistent error by signature", () => {
    const payload = { name: "Error", message: "recurring", scope: "feed" };
    reportErrorToDiscord(payload);
    reportErrorToDiscord(payload);
    reportErrorToDiscord(payload);
    expect(sent).toHaveLength(1);
  });

  it("sends distinct failures separately", () => {
    reportErrorToDiscord({ name: "Error", message: "one", scope: "feed" });
    reportErrorToDiscord({ name: "Error", message: "two", scope: "feed" });
    expect(sent).toHaveLength(2);
  });

  it("separates errors that share a message but not a digest", () => {
    // The production case: React replaces a server-component error's message
    // with one fixed string, so the digest is all that distinguishes them. If it
    // were left out of the signature, only the first of these would ever alert.
    const base = {
      name: "Error",
      message: "An error occurred in the Server Components render.",
      scope: "route-error",
    };
    reportErrorToDiscord({ ...base, digest: "1111111111" });
    reportErrorToDiscord({ ...base, digest: "2222222222" });
    reportErrorToDiscord({ ...base, digest: "1111111111" });
    expect(sent).toHaveLength(2);
  });

  it("never reports the Discord transport's own failures (no alert loop)", () => {
    reportErrorToDiscord({ name: "Error", message: "status 429", scope: "discord/send" });
    reportErrorToDiscord({ name: "Error", message: "config", scope: "discord/config" });
    expect(sent).toHaveLength(0);
  });

  it("carries the page url and digest when present", () => {
    reportErrorToDiscord({
      name: "Error",
      message: "client boom",
      scope: "route-error",
      url: "https://nacnano.dev/activity",
      digest: "abc123",
    });
    const embed = sent[0]?.embeds?.[0];
    expect(embed?.fields?.some((f) => f.value.includes("/activity"))).toBe(true);
    expect(embed?.footer?.text).toContain("abc123");
  });

  it("keeps the title inside Discord's 256-char embed limit", () => {
    reportErrorToDiscord({ name: "Error", message: "long", scope: "s".repeat(400) });
    const title = sent[0]?.embeds?.[0]?.title ?? "";
    expect(title.length).toBeLessThanOrEqual(256);
  });

  it("retries a failure that never reached Discord instead of burning the alert", async () => {
    // A 429, a timeout, or a bot that is not configured yet must not cost the
    // alert: the signature is released so the next occurrence tries again.
    delivers = false;
    const payload = { name: "Error", message: "transient", scope: "feed" };
    reportErrorToDiscord(payload);
    await flush();
    expect(sent).toHaveLength(1);

    delivers = true;
    reportErrorToDiscord(payload);
    await flush();
    expect(sent).toHaveLength(2);

    // Once it lands, the de-dup holds again.
    reportErrorToDiscord(payload);
    expect(sent).toHaveLength(2);
  });

  it("caps what the public report endpoint can spend, without muting the server", () => {
    // `source: "browser"` marks a payload that came through the unauthenticated
    // `POST /api/report`, where signatures are attacker-chosen.
    for (let i = 0; i < 40; i += 1) {
      reportErrorToDiscord({
        name: "Error",
        message: `forged ${i}`,
        scope: "client-report",
        source: "browser",
      });
    }
    expect(sent).toHaveLength(5);

    // The real server-side alert still gets through — the flood did not consume
    // the whole budget, and nothing is permanently muted.
    reportErrorToDiscord({ name: "Error", message: "real", scope: "activity-feed" });
    expect(sent).toHaveLength(6);
    expect(sent[5]?.embeds?.[0]?.title).toContain("activity-feed");
  });

  it("bounds total sends per window, then recovers when the window rolls", () => {
    const realNow = Date.now;
    let clock = realNow();
    Date.now = () => clock;
    try {
      for (let i = 0; i < 50; i += 1) {
        reportErrorToDiscord({ name: "Error", message: `distinct ${i}`, scope: "feed" });
      }
      expect(sent).toHaveLength(20);

      // Half an hour on, the budget refills and the ledger's entries have aged
      // out — a still-broken route alerts again rather than staying silent for
      // the life of the process.
      clock += 31 * 60_000;
      reportErrorToDiscord({ name: "Error", message: "distinct 0", scope: "feed" });
      expect(sent).toHaveLength(21);
    } finally {
      Date.now = realNow;
    }
  });
});
