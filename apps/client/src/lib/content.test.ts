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
  requireAuthorName,
  requireAuthorOptionalString,
  requireAuthorEmail,
  requireAuthorUrl,
  validateContentGraph,
  runContentGraphCheck,
  type Author,
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

describe("author validators", () => {
  it("requireAuthorName refuses blank and non-strings", () => {
    expect(requireAuthorName("Nacnano", "a.mdx")).toBe("Nacnano");
    expect(() => requireAuthorName("", "a.mdx")).toThrow(/non-empty string/);
    expect(() => requireAuthorName(42, "a.mdx")).toThrow(/non-empty string/);
    // The old `String(...)` coercion turned a boolean into the byline "true".
    expect(() => requireAuthorName(true, "a.mdx")).toThrow(/non-empty string/);
  });

  it("requireAuthorOptionalString rejects coercion of foreign types", () => {
    expect(requireAuthorOptionalString("Dev", "occupation", "a.mdx")).toBe("Dev");
    expect(requireAuthorOptionalString(null, "occupation", "a.mdx")).toBeUndefined();
    expect(() => requireAuthorOptionalString(["a"], "occupation", "a.mdx")).toThrow(
      /string when present/
    );
  });

  it("requireAuthorEmail checks shape when present", () => {
    expect(requireAuthorEmail("a@b.co", "email", "a.mdx")).toBe("a@b.co");
    expect(requireAuthorEmail(undefined, "email", "a.mdx")).toBeUndefined();
    expect(() => requireAuthorEmail("nope", "email", "a.mdx")).toThrow(/valid email/);
  });

  it("requireAuthorUrl requires an absolute http(s) URL", () => {
    expect(requireAuthorUrl("https://x.com/a", "twitter", "a.mdx")).toBe(
      "https://x.com/a"
    );
    expect(requireAuthorUrl(undefined, "twitter", "a.mdx")).toBeUndefined();
    expect(() => requireAuthorUrl("@handle", "twitter", "a.mdx")).toThrow(
      /absolute http\(s\) URL/
    );
    expect(() => requireAuthorUrl("javascript:alert(1)", "twitter", "a.mdx")).toThrow(
      /http\(s\) URL/
    );
  });
});

function blogFixture(overrides: Partial<Blog>): Blog {
  return {
    slug: "post",
    path: "blogs/post",
    filePath: "blogs/post.mdx",
    title: "Post",
    date: "2026-09-14T00:00:00.000Z",
    tags: [],
    readingTime: { text: "1 min", minutes: 1, time: 1000, words: 1 },
    body: "",
    ...overrides,
  };
}

function authorFixture(overrides: Partial<Author>): Author {
  return { slug: "default", name: "Nacnano", body: "", ...overrides };
}

const present = (files: string[]) => ({
  exists: (rel: string) => files.includes(rel),
});

describe("validateContentGraph", () => {
  it("passes on a sound graph", () => {
    const blogs = [blogFixture({ slug: "hello", summary: "hi", authors: ["default"] })];
    const authors = [authorFixture({ avatar: "/static/images/logo.png" })];
    expect(
      validateContentGraph(blogs, authors, present(["static/images/logo.png"]))
    ).toEqual([]);
  });

  it("rejects an unknown author reference on a published post", () => {
    const blogs = [blogFixture({ summary: "hi", authors: ["ghost"] })];
    const problems = validateContentGraph(blogs, [authorFixture({})], present([]));
    expect(problems.join("\n")).toMatch(/unknown author "ghost"/);
  });

  it("requires a summary on a published post but not a draft", () => {
    const noSummary = [blogFixture({ slug: "a" })];
    expect(validateContentGraph(noSummary, [], present([])).join("\n")).toMatch(
      /missing a summary/
    );
    const draft = [blogFixture({ slug: "a", draft: true })];
    expect(validateContentGraph(draft, [], present([]))).toEqual([]);
  });

  it("flags duplicate author and blog slugs", () => {
    const dup = validateContentGraph(
      [],
      [authorFixture({}), authorFixture({})],
      present([])
    );
    expect(dup.join("\n")).toMatch(/duplicate author slug/);
    const dupBlog = validateContentGraph(
      [blogFixture({ slug: "x" }), blogFixture({ slug: "x", summary: "s" })],
      [],
      present([])
    );
    expect(dupBlog.join("\n")).toMatch(/duplicate blog slug/);
  });

  it("rejects non-route-compatible slugs", () => {
    const problems = validateContentGraph(
      [blogFixture({ slug: "Bad Slug", summary: "s" })],
      [],
      present([])
    );
    expect(problems.join("\n")).toMatch(/not route-compatible/);
  });

  it("verifies local images/avatars exist and rejects traversal", () => {
    const missing = validateContentGraph(
      [blogFixture({ summary: "s", images: ["/static/images/gone.png"] })],
      [],
      present([])
    );
    expect(missing.join("\n")).toMatch(/missing file public\/static\/images\/gone.png/);

    const traversal = validateContentGraph(
      [blogFixture({ summary: "s", images: ["/../../etc/passwd"] })],
      [],
      present([])
    );
    expect(traversal.join("\n")).toMatch(/unsafe local asset path/);
  });

  it("rejects a remote asset — this site cannot serve remote images", () => {
    // next.config pins images.remotePatterns to [] and CSP img-src is 'self',
    // so the only honest verdict for a scheme-carrying URL is "broken". An
    // earlier version blessed https URLs as sound; the check now rejects them.
    const remote = validateContentGraph(
      [blogFixture({ summary: "s", images: ["https://cdn.example/x.png"] })],
      [],
      present([])
    );
    expect(remote.join("\n")).toMatch(/remote asset/);
    // A non-http scheme is a remote asset too, not a silent pass.
    const js = validateContentGraph(
      [blogFixture({ summary: "s", images: ["javascript:alert(1)"] })],
      [],
      present([])
    );
    expect(js.join("\n")).toMatch(/remote asset/);
  });

  it("rejects a protocol-relative asset path, not just a traversal", () => {
    // `//evil.com/x.png` passes startsWith("/") and has no "..", so without an
    // explicit guard it collapses to `evil.com/x.png` and only fails incidentally
    // (or passes if such a file ever lived under public/). The browser resolves
    // it to a remote fetch — reject it by name.
    const proto = validateContentGraph(
      [blogFixture({ summary: "s", images: ["//evil.com/x.png"] })],
      [],
      present([])
    );
    expect(proto.join("\n")).toMatch(/protocol-relative asset path/);
  });

  it("resolves a local asset past a cache-busting query or fragment", () => {
    // The browser fetches /static/x.png?v=2 from public/static/x.png, so the
    // probe must strip the query before hitting disk.
    const q = validateContentGraph(
      [blogFixture({ summary: "s", images: ["/static/images/logo.png?v=2#top"] })],
      [],
      present(["static/images/logo.png"])
    );
    expect(q).toEqual([]);
    // A malformed % sequence must not throw out of the probe — it falls back to
    // the raw path and reports missing like any other absent file.
    const bad = validateContentGraph(
      [blogFixture({ summary: "s", images: ["/static/%.png"] })],
      [],
      present([])
    );
    expect(bad.join("\n")).toMatch(/missing file public\/static\/%\.png/);
  });

  it("may reference a missing author while a draft, but not once published", () => {
    // Pins the deliberate decision that drafts skip the published-only author
    // resolution, so a later refactor cannot quietly reverse it.
    const draft = [blogFixture({ slug: "wip", draft: true, authors: ["ghost"] })];
    expect(validateContentGraph(draft, [], present([]))).toEqual([]);
    // The same reference on a published post is a build failure.
    const published = [blogFixture({ slug: "live", summary: "s", authors: ["ghost"] })];
    expect(validateContentGraph(published, [], present([])).join("\n")).toMatch(
      /unknown author "ghost"/
    );
  });

  it("the real, published corpus is internally consistent", () => {
    // The same gate the postbuild step runs against disk, asserted here so a
    // future bad reference fails `bun run test` before it can reach a build.
    expect(runContentGraphCheck()).toEqual([]);
  });
});
