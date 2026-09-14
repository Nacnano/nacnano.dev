import { describe, expect, it } from "bun:test";
import { publishedBlogs } from "@/lib/content";
import siteMetadata from "@/data/siteMetadata";
import { resolveVisitTitle } from "./visitTitles";

/**
 * The title resolver is the piece that decides what text the public feed renders
 * as a link, so it must resolve only from content we control — the static route
 * map and the real MDX corpus — never from anything the client sends.
 */
describe("resolveVisitTitle", () => {
  it("labels the static routes from the site's own map", () => {
    expect(resolveVisitTitle("/")).toBe(siteMetadata.title);
    expect(resolveVisitTitle("/about")).toBe("About");
    expect(resolveVisitTitle("/projects")).toBe("Things I've made");
    expect(resolveVisitTitle("/activity")).toBe("Activity");
  });

  it("resolves a real blog path to its authored title", () => {
    const post = publishedBlogs()[0];
    if (!post) throw new Error("no published posts to assert against");
    expect(resolveVisitTitle(`/blogs/${post.slug}`)).toBe(post.title);
  });

  it("ignores a trailing slash on a blog path", () => {
    const post = publishedBlogs()[0];
    if (!post) throw new Error("no published posts to assert against");
    expect(resolveVisitTitle(`/blogs/${post.slug}/`)).toBe(post.title);
  });

  it("returns nothing for an unknown or non-blog internal path", () => {
    expect(resolveVisitTitle("/does-not-exist")).toBeUndefined();
    expect(resolveVisitTitle("/blogs/there-is-no-such-post")).toBeUndefined();
  });
});
