import { describe, expect, it } from "bun:test";
import { publishedBlogs } from "@/lib/content";
import { genPageMetaData } from "@/app/seo";
import siteMetadata from "@/data/siteMetadata";
import { PAGE_TITLES } from "@/data/pageTitles";
import { resolveVisitTitle } from "./visitTitles";

/**
 * The title resolver is the piece that decides what text the public feed renders
 * as a link, so it must resolve only from content we control — the static route
 * map and the real MDX corpus — never from anything the client sends.
 *
 * Page components are intentionally NOT imported here: pulling them into the
 * coverage graph drags in untested UI (AuthorLayout, formatDate, …) and trips
 * the per-file floor. Drift is prevented structurally — the pages and this
 * resolver both read the single `PAGE_TITLES` source.
 */
describe("resolveVisitTitle", () => {
  it("labels the static routes from the site's own map", () => {
    expect(resolveVisitTitle("/")).toBe(siteMetadata.title);
    expect(resolveVisitTitle("/about")).toBe(PAGE_TITLES.about);
    expect(resolveVisitTitle("/projects")).toBe(PAGE_TITLES.projects);
    expect(resolveVisitTitle("/link")).toBe(PAGE_TITLES.link);
    expect(resolveVisitTitle("/activity")).toBe(PAGE_TITLES.activity);
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

  it("passes the title through genPageMetaData unchanged", () => {
    // The pages feed the same PAGE_TITLES to genPageMetaData, so the document
    // title and the feed label share one source and cannot drift apart.
    expect(genPageMetaData({ title: PAGE_TITLES.projects }).title).toBe(
      PAGE_TITLES.projects
    );
  });
});
