import { describe, it, expect } from "bun:test";
import {
  allBlogs,
  blogStructuredData,
  getBlog,
  jsonLdScriptProps,
  publishedBlogs,
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
