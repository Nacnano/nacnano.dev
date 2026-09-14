import { describe, it, expect } from "bun:test";
import {
  allBlogs,
  blogStructuredData,
  getBlog,
  jsonLdScriptProps,
  publishedBlogs,
  requireNonEmptyString,
  requireIsoDate,
  requireStringArray,
  requireBooleanOrUndefined,
  requireOptionalString,
  requireKnownLayout,
  type Blog,
} from "./content";
import siteMetadata from "@/data/siteMetadata";

/**
 * Smoke tests against the site's real MDX corpus: they assert the loader wires
 * the actual content correctly. Parsing RULES that need edge-case fixtures
 * (draft handling, malformed frontmatter) belong in fixture-based tests as the
 * corpus grows — these will change shape if posts are added or all go draft.
 */
describe("content loader", () => {
  it("publishes siteUrl without a trailing slash (rss/sitemap depend on it)", () => {
    expect(siteMetadata.siteUrl).not.toMatch(/\/$/);
  });

  it("parses every blog into the shape the routes rely on", () => {
    const blogs = allBlogs();
    expect(blogs.length).toBeGreaterThan(0);
    for (const blog of blogs) {
      expect(blog.slug.length).toBeGreaterThan(0);
      expect(blog.path).toBe(`blogs/${blog.slug}`);
      // Frontmatter dates are normalised to full ISO timestamps.
      expect(blog.date).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(blog.readingTime.minutes).toBeGreaterThanOrEqual(0);
    }
  });

  it("orders the collection newest first", () => {
    const times = publishedBlogs().map((b) => new Date(b.date).getTime());
    for (let i = 1; i < times.length; i += 1) {
      expect(times[i]).toBeLessThanOrEqual(times[i - 1] as number);
    }
  });

  it("keeps drafts out of the published set", () => {
    const published = new Set(publishedBlogs().map((b) => b.slug));
    for (const draft of allBlogs().filter((b) => b.draft)) {
      expect(published.has(draft.slug)).toBe(false);
    }
  });

  it("resolves a post by slug and returns nothing for a miss", () => {
    const first = publishedBlogs()[0];
    expect(first).toBeDefined();
    expect(getBlog(first?.slug ?? "")?.slug).toBe(first?.slug);
    expect(getBlog("there-is-no-such-post")).toBeUndefined();
  });

  it("builds schema.org BlogPosting structured data", () => {
    const post = publishedBlogs()[0];
    if (!post) throw new Error("no published posts to assert against");
    const jsonLd = blogStructuredData(post, ["Nacnano"]);
    expect(jsonLd["@type"]).toBe("BlogPosting");
    expect(jsonLd.headline).toBe(post.title);
    expect(jsonLd.url).toContain(`/blogs/${post.slug}`);
    expect(jsonLd.author).toEqual([{ "@type": "Person", name: "Nacnano" }]);
  });
});

describe("jsonLdScriptProps", () => {
  // The whole point of the helper is that a specific byte sequence never reaches
  // the output — so assert it directly, on a fixture rather than the live MDX
  // corpus: this test is about string escaping, not disk reads, and a literal
  // keeps it hermetic (no load-bearing cast on a possibly-empty blogs dir).
  const post: Blog = {
    slug: "escape-me",
    path: "blogs/escape-me",
    filePath: "blogs/escape-me.mdx",
    title: "A </script><img onerror=x> title",
    date: "2026-09-14T00:00:00.000Z",
    tags: [],
    readingTime: { text: "1 min", minutes: 1, time: 1000, words: 1 },
    body: "",
  };
  const payload = blogStructuredData(post, ["N"]);
  const html = jsonLdScriptProps(payload).dangerouslySetInnerHTML.__html;

  it("sets the ld+json script type", () => {
    expect(jsonLdScriptProps({}).type).toBe("application/ld+json");
  });

  it("never emits a closing script tag", () => {
    expect(html).not.toContain("</script>");
    expect(html.toLowerCase()).not.toContain("<img");
  });

  it("is lossless — the escaped output parses back to the original data", () => {
    // This is the claim in the code comment that nothing else checks: escaping
    // `<` must not corrupt the structured data Google reads.
    expect(JSON.parse(html).headline).toBe("A </script><img onerror=x> title");
  });
});

/**
 * The reject branches, exercised directly (no disk). These are the validations
 * the PR exists to add — the happy corpus already parsed fine before it, so
 * without these the new guards would ship entirely untested.
 */
describe("frontmatter validators", () => {
  it("requireNonEmptyString rejects blank and non-strings", () => {
    expect(requireNonEmptyString("Hello", "title", "x.mdx")).toBe("Hello");
    expect(() => requireNonEmptyString("", "title", "x.mdx")).toThrow(/non-empty string/);
    expect(() => requireNonEmptyString(42, "title", "x.mdx")).toThrow(/non-empty string/);
  });

  it("requireIsoDate accepts Date/string but rejects the number/boolean typos", () => {
    expect(requireIsoDate("2026-09-14", "date", "x.mdx")).toMatch(/^2026-09-14T/);
    expect(requireIsoDate(new Date("2026-09-14"), "date", "x.mdx")).toMatch(
      /^2026-09-14T/
    );
    // The whole point: these used to coerce to a bogus 1970 timestamp.
    expect(() => requireIsoDate(2026, "date", "x.mdx")).toThrow(/must be a date/);
    expect(() => requireIsoDate(true, "date", "x.mdx")).toThrow(/must be a date/);
    expect(() => requireIsoDate([], "date", "x.mdx")).toThrow(/must be a date/);
    // Right type, unparseable value — the value is echoed so the fix is obvious.
    expect(() => requireIsoDate("not-a-date", "date", "x.mdx")).toThrow(
      /not a valid date/
    );
  });

  it("requireStringArray rejects scalars and foreign elements", () => {
    expect(requireStringArray(["a", "b"], "tags", "x.mdx")).toEqual(["a", "b"]);
    expect(requireStringArray(undefined, "tags", "x.mdx")).toBeUndefined();
    expect(() => requireStringArray("foo", "tags", "x.mdx")).toThrow(/array of strings/);
    expect(() => requireStringArray(["ok", 1], "tags", "x.mdx")).toThrow(
      /array of strings/
    );
  });

  it("requireBooleanOrUndefined refuses a quoted YAML boolean", () => {
    expect(requireBooleanOrUndefined(true, "draft", "x.mdx")).toBe(true);
    expect(requireBooleanOrUndefined(undefined, "draft", "x.mdx")).toBeUndefined();
    // `draft: 'true'` would otherwise treat the post as published.
    expect(() => requireBooleanOrUndefined("true", "draft", "x.mdx")).toThrow(/boolean/);
  });

  it("requireOptionalString rejects a non-string but allows blank/missing", () => {
    expect(requireOptionalString("hi", "summary", "x.mdx")).toBe("hi");
    expect(requireOptionalString("", "summary", "x.mdx")).toBeUndefined();
    expect(requireOptionalString(undefined, "summary", "x.mdx")).toBeUndefined();
    expect(() => requireOptionalString(42, "summary", "x.mdx")).toThrow(
      /string when present/
    );
  });

  it("requireKnownLayout rejects a typo'd layout name", () => {
    expect(requireKnownLayout("BlogWithDetail", "layout", "x.mdx")).toBe(
      "BlogWithDetail"
    );
    expect(requireKnownLayout(undefined, "layout", "x.mdx")).toBeUndefined();
    // `resolveLayout`'s silent default-layout fallback is now a build failure.
    expect(() => requireKnownLayout("BlogWithDetial", "layout", "x.mdx")).toThrow(
      /must be one of/
    );
    expect(() => requireKnownLayout(42, "layout", "x.mdx")).toThrow(/must be one of/);
  });

  it("treats a bare YAML key (null) as absent for optional fields, consistently", () => {
    // `tags:` / `draft:` / `summary:` / `layout:` with nothing after them parse
    // to null. Every optional field now reads that as "not provided" rather than
    // some treating it as absent and others failing the build.
    expect(requireStringArray(null, "tags", "x.mdx")).toBeUndefined();
    expect(requireBooleanOrUndefined(null, "draft", "x.mdx")).toBeUndefined();
    expect(requireOptionalString(null, "summary", "x.mdx")).toBeUndefined();
    expect(requireKnownLayout(null, "layout", "x.mdx")).toBeUndefined();
    // A required field still rejects it — null is not a date.
    expect(() => requireIsoDate(null, "date", "x.mdx")).toThrow(/must be a date/);
  });
});
