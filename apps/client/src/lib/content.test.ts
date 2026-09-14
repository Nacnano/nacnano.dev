import { describe, it, expect } from "bun:test";
import { allBlogs, publishedBlogs, getBlog, blogStructuredData } from "./content";
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
