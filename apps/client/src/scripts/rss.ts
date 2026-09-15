/**
 * The site's RSS feeds, written into `public/` after the build.
 *
 * Two channels off one renderer: `/feed.xml` for essays and `/ama/rss.xml` for
 * answered questions. Kept as separate feeds rather than one merged one because
 * they are separate subscriptions — someone following the writing has not asked
 * to be told every time a question gets answered, and the reference /ama does
 * the same.
 *
 * Everything channel-specific arrives as data (`FeedItem`, `FeedChannel`), so
 * adding the second feed added no second copy of the escaping or the envelope —
 * which is the bug this file has already had once (see `lib/feed.ts`).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import siteMetadata from "../data/siteMetadata";
import { publishedBlogs } from "../lib/content";
import { mdToPlainText, publishedAma } from "../lib/ama";
import { amaUrl, postUrl, trimTrailingSlash } from "../lib/feed";

export type FeedItem = {
  /** Absolute canonical URL. Doubles as the guid, so it must be unique. */
  url: string;
  title: string;
  /** ISO date. */
  date: string;
  description?: string;
  categories?: string[];
};

export type FeedChannel = {
  title: string;
  description: string;
  /** Absolute path this feed is served at, for the `atom:link` self reference. */
  path: string;
};

const escapeXml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

export function renderItem(item: FeedItem): string {
  return `
  <item>
    <guid>${item.url}</guid>
    <title>${escapeXml(item.title)}</title>
    <link>${item.url}</link>
    ${item.description ? `<description>${escapeXml(item.description)}</description>` : ""}
    <pubDate>${new Date(item.date).toUTCString()}</pubDate>
    <author>${siteMetadata.email} (${siteMetadata.author})</author>
    ${(item.categories ?? []).map((c) => `<category>${escapeXml(c)}</category>`).join("")}
  </item>`;
}

export function renderFeed(items: FeedItem[], channel: FeedChannel): string {
  const site = trimTrailingSlash(siteMetadata.siteUrl);
  // Newest by value, not by array position — this export may be called with
  // unsorted input. Guard against an unparseable frontmatter date, which would
  // otherwise emit the literal string "Invalid Date" and break feed validators.
  const newestMs = items.reduce((max, i) => Math.max(max, new Date(i.date).getTime()), 0);
  const lastBuild =
    Number.isFinite(newestMs) && newestMs > 0 ? new Date(newestMs) : new Date();
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(channel.title)}</title>
    <link>${site}</link>
    <description>${escapeXml(channel.description)}</description>
    <language>${siteMetadata.language}</language>
    <managingEditor>${siteMetadata.email} (${siteMetadata.author})</managingEditor>
    <webMaster>${siteMetadata.email} (${siteMetadata.author})</webMaster>
    <lastBuildDate>${lastBuild.toUTCString()}</lastBuildDate>
    <atom:link href="${site}${channel.path}" rel="self" type="application/rss+xml"/>
    ${items.map(renderItem).join("")}
  </channel>
</rss>
`;
}

export const BLOG_CHANNEL: FeedChannel = {
  title: siteMetadata.title,
  description: siteMetadata.description,
  path: "/feed.xml",
};

export const AMA_CHANNEL: FeedChannel = {
  title: `${siteMetadata.title} · Ask me anything`,
  description: "Questions people have asked Nac, and the answers worth keeping.",
  path: "/ama/rss.xml",
};

export function blogFeedItems(): FeedItem[] {
  return publishedBlogs().map((post) => ({
    url: postUrl(siteMetadata.siteUrl, post.slug),
    title: post.title,
    date: post.date,
    description: post.summary,
    categories: post.tags,
  }));
}

export function amaFeedItems(): FeedItem[] {
  return publishedAma().map((entry) => ({
    url: amaUrl(siteMetadata.siteUrl, entry.slug),
    title: entry.question,
    date: entry.date,
    // The whole answer, not a truncation: an AMA reply is a few sentences by
    // design, and `mdToPlainText` is the same conservative strip the JSON-LD
    // uses — so a reader gets the answer in their reader, and the markdown
    // syntax does not leak into it.
    description: mdToPlainText(entry.answer),
  }));
}

function writeFeed(file: string, items: FeedItem[], channel: FeedChannel, label: string) {
  if (items.length === 0) {
    console.log(`${label} feed skipped: nothing published.`);
    return;
  }
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, renderFeed(items, channel));
  console.log(`${label} feed generated (${items.length} items).`);
}

export default function rss() {
  writeFeed("./public/feed.xml", blogFeedItems(), BLOG_CHANNEL, "RSS");
  writeFeed("./public/ama/rss.xml", amaFeedItems(), AMA_CHANNEL, "AMA");
}
