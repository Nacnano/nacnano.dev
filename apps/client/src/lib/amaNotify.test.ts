import { describe, it, expect, afterEach } from "bun:test";
import {
  isNotifyConfigured,
  notificationPayload,
  notifyNewQuestion,
  questionPreview,
} from "./amaNotify";
import type { AskRecord } from "./amaInbox";

/**
 * The notifier's payload shaping is pure and gets fixtures. Delivery is
 * exercised against a real local server rather than a mocked `fetch`, because
 * the property that matters — it resolves without throwing however the endpoint
 * behaves — is precisely the one a stub would assume rather than prove.
 */

const record: AskRecord = {
  id: "6f1b1e4a-0000-4000-8000-000000000000",
  ts: "2026-09-14T10:00:00.000Z",
  question: "Why zinc?",
};

const originalUrl = process.env.AMA_NOTIFY_URL;
afterEach(() => {
  if (originalUrl === undefined) delete process.env.AMA_NOTIFY_URL;
  else process.env.AMA_NOTIFY_URL = originalUrl;
});

describe("questionPreview", () => {
  it("collapses a multi-line question to one line", () => {
    expect(questionPreview("one.\n\n  two.")).toBe("one. two.");
  });

  it("caps a long question and marks the truncation", () => {
    const preview = questionPreview("a".repeat(400));
    expect(preview).toHaveLength(280);
    expect(preview.endsWith("…")).toBe(true);
  });

  it("leaves a question that already fits alone", () => {
    expect(questionPreview("Why zinc?")).toBe("Why zinc?");
    expect(questionPreview("Why zinc?").endsWith("…")).toBe(false);
  });
});

describe("notificationPayload", () => {
  // Slack renders `text`, Discord renders `content`. Sending both is what lets
  // one env var point at either service with no adapter in the module.
  it("carries the same summary under both Slack's and Discord's key", () => {
    const payload = notificationPayload(record);
    expect(payload.text).toBe(payload.content);
    expect(payload.text).toContain("Why zinc?");
    expect(payload.text).toContain("/ama");
  });

  it("keeps the full question alongside the truncated summary", () => {
    const long = { ...record, question: "a".repeat(400) };
    const payload = notificationPayload(long);
    expect(payload.question).toHaveLength(400);
    expect(payload.text.length).toBeLessThan(400);
  });

  it("omits contact entirely when the asker left none", () => {
    expect(notificationPayload(record)).not.toHaveProperty("contact");
    expect(notificationPayload(record).text).not.toContain("from");
  });

  it("includes contact in both the summary and the structured fields", () => {
    const payload = notificationPayload({ ...record, contact: "a@b.c" });
    expect(payload.contact).toBe("a@b.c");
    expect(payload.text).toContain("from a@b.c");
  });
});

describe("notifyNewQuestion", () => {
  it("is a no-op with no endpoint configured", async () => {
    delete process.env.AMA_NOTIFY_URL;
    expect(isNotifyConfigured()).toBe(false);
    // No endpoint to hit, so the only assertion available is that it returns.
    expect(await notifyNewQuestion(record)).toBeUndefined();
  });

  it("POSTs the payload as JSON to the configured endpoint", async () => {
    let received: unknown;
    const server = Bun.serve({
      port: 0,
      async fetch(request) {
        received = await request.json();
        return new Response("ok");
      },
    });
    process.env.AMA_NOTIFY_URL = `http://localhost:${server.port}/hook`;

    await notifyNewQuestion({ ...record, contact: "a@b.c" });
    server.stop(true);

    expect(isNotifyConfigured()).toBe(true);
    expect(received).toMatchObject({
      source: "ama",
      id: record.id,
      question: "Why zinc?",
      contact: "a@b.c",
    });
  });

  // A revoked or typo'd webhook must not take the submission down with it.
  it("resolves quietly when the endpoint rejects the POST", async () => {
    const server = Bun.serve({
      port: 0,
      fetch: () => new Response("nope", { status: 404 }),
    });
    process.env.AMA_NOTIFY_URL = `http://localhost:${server.port}/hook`;

    expect(await notifyNewQuestion(record)).toBeUndefined();
    server.stop(true);
  });

  it("resolves quietly when the endpoint is unreachable", async () => {
    // Port 1 is reserved and nothing listens on it; the connection is refused.
    process.env.AMA_NOTIFY_URL = "http://localhost:1/hook";
    expect(await notifyNewQuestion(record)).toBeUndefined();
  });
});
