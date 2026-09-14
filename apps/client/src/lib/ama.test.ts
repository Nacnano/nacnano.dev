import { describe, it, expect } from "bun:test";
import { publishedAma, mdToPlainText, amaStructuredData } from "./ama";
import siteMetadata from "@/data/siteMetadata";

/**
 * Smoke tests against the real /ama corpus, in the same shape as
 * `content.test.ts`: they assert the read helpers wire the actual content
 * correctly rather than exercising edge cases the data file cannot contain.
 */
describe("ama read helpers", () => {
  it("publishes at least one answered question", () => {
    expect(publishedAma().length).toBeGreaterThan(0);
  });

  it("orders answers newest first", () => {
    const times = publishedAma().map((e) => new Date(e.date).getTime());
    for (let i = 1; i < times.length; i += 1) {
      expect(times[i]).toBeLessThanOrEqual(times[i - 1] as number);
    }
  });

  it("gives every answer a slug and non-empty question and body", () => {
    for (const entry of publishedAma()) {
      expect(entry.slug).toMatch(/^[a-z0-9-]+$/);
      expect(entry.question.trim().length).toBeGreaterThan(0);
      expect(entry.answer.trim().length).toBeGreaterThan(0);
    }
  });

  it("strips markdown syntax without inventing prose", () => {
    expect(mdToPlainText("See [the résumé](https://resume.nacnano.dev) first.")).toBe(
      "See the résumé first."
    );
    expect(mdToPlainText("**bold** and `code` and _em_")).toBe("bold and code and em");
    // A fenced block's contents vanish rather than leaking raw syntax into a snippet.
    expect(mdToPlainText("intro\n```js\nconst x = 1;\n```\n")).toBe("intro");
  });

  it("builds a schema.org FAQPage with the author on each answer", () => {
    const jsonLd = amaStructuredData(publishedAma());
    expect(jsonLd["@type"]).toBe("FAQPage");
    const first = jsonLd.mainEntity[0];
    if (!first) throw new Error("no answers to assert against");
    expect(first["@type"]).toBe("Question");
    expect(first.acceptedAnswer.author.name).toBe(siteMetadata.author);
    // The answer text must not carry raw markdown.
    expect(first.acceptedAnswer.text).not.toContain("](");
  });
});
