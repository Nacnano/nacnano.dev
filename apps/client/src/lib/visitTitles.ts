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
import { publishedBlogs } from "./content";

const STATIC_TITLES: Record<string, string> = {
  "/": siteMetadata.title,
  "/about": "About",
  "/projects": "Things I've made",
  "/link": "Links",
  "/activity": "Activity",
};

const BLOG_PREFIX = "/blogs/";

/** Human label for an already-validated internal path, or undefined. */
export function resolveVisitTitle(path: string): string | undefined {
  const staticTitle = STATIC_TITLES[path];
  if (staticTitle) return staticTitle;

  if (path.startsWith(BLOG_PREFIX)) {
    const slug = path.slice(BLOG_PREFIX.length).replace(/\/+$/, "");
    // `blog.path` is stored without a leading slash, e.g. `blogs/hello`.
    const post = publishedBlogs().find((blog) => blog.slug === slug);
    return post?.title;
  }

  return undefined;
}
