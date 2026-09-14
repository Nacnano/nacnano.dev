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

export function trimTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}
