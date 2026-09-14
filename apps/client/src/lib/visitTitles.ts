/**
 * Server-only title lookup for a recorded visit.
 *
 * The visit beacon is unauthenticated, so any `title` it sends is attacker
 * chosen — and the feed renders that title as a link's text. We refuse to store
 * it. Instead we resolve the label from content we control, keyed by the path
 * we also validate: the static pages through a small map, blog posts through
 * the same loader the routes render with. An unknown internal path simply has
 * no title, and the feed falls back to showing the path.
 *
 * Importing the content loader is fine here because this module is only ever
 * pulled into route handlers (server runtime); it must never be imported by a
 * client component.
 */

import siteMetadata from "@/data/siteMetadata";
import { PAGE_TITLES } from "@/data/pageTitles";
import { publishedBlogs } from "./content";

const STATIC_TITLES: Record<string, string> = {
  "/": siteMetadata.title,
  "/about": PAGE_TITLES.about,
  "/projects": PAGE_TITLES.projects,
  "/link": PAGE_TITLES.link,
  "/activity": PAGE_TITLES.activity,
};

const BLOG_PREFIX = "/blogs/";

/**
 * Human label for an already-validated internal path, or undefined.
 *
 * This runs on the beacon's request path, so it owns its own failure: the
 * lookup reads MDX off disk (memoised, but the first call per lambda instance
 * does I/O, and #30 makes the loader throw on malformed frontmatter). A title
 * lookup must never be the reason the fire-and-forget beacon errors — so any
 * throw degrades to "no title" (the feed then shows the path), exactly as
 * `allowVisit` degrades to allow on a store outage.
 */
export function resolveVisitTitle(path: string): string | undefined {
  try {
    const staticTitle = STATIC_TITLES[path];
    if (staticTitle) return staticTitle;

    if (path.startsWith(BLOG_PREFIX)) {
      const slug = path.slice(BLOG_PREFIX.length).replace(/\/+$/, "");
      // `blog.path` is stored without a leading slash, e.g. `blogs/hello`.
      const post = publishedBlogs().find((blog) => blog.slug === slug);
      return post?.title;
    }

    return undefined;
  } catch {
    return undefined;
  }
}
