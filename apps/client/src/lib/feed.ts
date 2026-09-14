/**
 * URL construction for the RSS feed and sitemap.
 *
 * Extracted because both shipped the wrong route prefix once: the feed emitted
 * `/blog/<slug>` for a `/blogs/<slug>` route, so every item in it 404'd.
 */

/** The canonical public URL for a post. */
export function postUrl(siteUrl: string, slug: string): string {
  return `${trimTrailingSlash(siteUrl)}/blogs/${slug}`;
}

/**
 * The canonical public URL for an answered question.
 *
 * A fragment on the index, because that is where the answer is: /ama renders
 * every answer inline rather than linking out to a page per question. The
 * fragment is the `slug`, which is also the heading's DOM id and is asserted
 * unique in `lib/ama.test.ts` — so this is a stable, distinct guid per item,
 * and it keeps its meaning if per-question routes are ever added.
 */
export function amaUrl(siteUrl: string, slug: string): string {
  return `${trimTrailingSlash(siteUrl)}/ama#${slug}`;
}

export function trimTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}
