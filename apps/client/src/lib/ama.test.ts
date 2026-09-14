import { describe, it, expect } from "bun:test";
import { publishedAma, mdToPlainText, amaStructuredData } from "./ama";
import { jsonLdScriptProps } from "./content";
import siteMetadata from "@/data/siteMetadata";

/**
 * Smoke tests against the real /ama corpus, in the same shape as
 * `content.test.ts`: they assert the read helpers wire the actual content
 * correctly rather than exercising edge cases the data file cannot contain.
 * `mdToPlainText` is the exception — it is a parser, so it gets fixtures.
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

  // `amaData.ts` is hand-edited every time a question is answered, which is
  // exactly where a copy-pasted entry keeps its neighbour's slug. A duplicate
  // is two identical DOM ids: the permalink jumps to the wrong answer, silently.
  it("gives every answer a unique slug", () => {
    const slugs = publishedAma().map((e) => e.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});

describe("mdToPlainText", () => {
  it("strips markdown syntax without inventing prose", () => {
    expect(mdToPlainText("See [the résumé](https://resume.nacnano.dev) first.")).toBe(
      "See the résumé first."
    );
    expect(mdToPlainText("**bold** and `code` and _em_")).toBe("bold and code and em");
    // A fenced block's contents vanish rather than leaking raw syntax into a snippet.
    expect(mdToPlainText("intro\n```js\nconst x = 1;\n```\n")).toBe("intro");
  });

  it("leaves intra-word underscores alone", () => {
    expect(mdToPlainText("Call `snake_case_name` here.")).toBe(
      "Call snake_case_name here."
    );
    expect(mdToPlainText("a __b__ c_d_e")).toBe("a b c_d_e");
  });

  it("requires matched emphasis delimiters", () => {
    expect(mdToPlainText("2 * 3 * 4")).toBe("2 * 3 * 4");
  });

  it("collapses a paragraph break to a single space", () => {
    expect(mdToPlainText("one.\n\ntwo.")).toBe("one. two.");
    expect(mdToPlainText("one.  \n  two.")).toBe("one. two.");
  });
});

describe("ama structured data", () => {
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

  // The page inlines this into a <script>; an unescaped `<` in an answer would
  // close the element early. The escaping lives in `jsonLdScriptProps`, but the
  // AMA payload has to actually go through it.
  it("escapes a closing script tag when inlined", () => {
    const html = jsonLdScriptProps(
      amaStructuredData([
        {
          slug: "x",
          question: "How do I embed a script?",
          answer: "Close it with </script> and see.",
          date: "2026-01-01",
        },
      ])
    ).dangerouslySetInnerHTML.__html;
    expect(html).not.toContain("</script>");
    expect(html).toContain("\\u003c/script>");
  });
});
