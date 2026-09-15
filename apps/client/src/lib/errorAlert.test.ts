import { afterAll, beforeEach, describe, expect, it, mock } from "bun:test";

/**
 * Unit-tests the Discord error sink in isolation: `discord.ts` is mocked (it is
 * server-only and owns the transport, and `sendDiscordMessage` takes no injectable
 * base URL so the wire-level fake the discord suite uses can't intercept it here).
 * What this asserts is the *policy* that lives in `errorAlert` — de-dup per
 * signature, never reporting the transport's own failures, and the embed shape.
 */
import * as discord from "./discord";
const discordReal = { ...discord };

type Sent = { embeds?: { title?: string; description?: string; color?: number }[] };
let sent: Sent[] = [];

mock.module("./discord", () => ({
  ...discordReal,
  sendDiscordMessage: (message: Sent) => {
    sent.push(message);
    return Promise.resolve();
  },
}));

import { reportErrorToDiscord, resetErrorAlertCacheForTests } from "./errorAlert";

beforeEach(() => {
  sent = [];
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
    const embed = sent[0]?.embeds?.[0] as {
      fields?: { name: string; value: string }[];
      footer?: { text: string };
    };
    expect(embed.fields?.some((f) => f.value.includes("/activity"))).toBe(true);
    expect(embed.footer?.text).toContain("abc123");
  });
});
