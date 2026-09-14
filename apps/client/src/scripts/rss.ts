import { writeFileSync } from "fs";
import siteMetadata from "../data/siteMetadata";
import { publishedBlogs, type Blog } from "../lib/content";
import { postUrl, trimTrailingSlash } from "../lib/feed";

type FeedPost = Pick<Blog, "slug" | "title" | "date" | "summary" | "tags">;

const escapeXml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

export function renderItem(post: FeedPost): string {
  const url = postUrl(siteMetadata.siteUrl, post.slug);
  return `
  <item>
    <guid>${url}</guid>
    <title>${escapeXml(post.title)}</title>
    <link>${url}</link>
    ${post.summary ? `<description>${escapeXml(post.summary)}</description>` : ""}
    <pubDate>${new Date(post.date).toUTCString()}</pubDate>
    <author>${siteMetadata.email} (${siteMetadata.author})</author>
    ${(post.tags ?? []).map((t) => `<category>${escapeXml(t)}</category>`).join("")}
  </item>`;
}

export function renderFeed(posts: FeedPost[]): string {
  const site = trimTrailingSlash(siteMetadata.siteUrl);
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(siteMetadata.title)}</title>
    <link>${site}</link>
    <description>${escapeXml(siteMetadata.description)}</description>
    <language>${siteMetadata.language}</language>
    <managingEditor>${siteMetadata.email} (${siteMetadata.author})</managingEditor>
    <webMaster>${siteMetadata.email} (${siteMetadata.author})</webMaster>
    <lastBuildDate>${new Date(posts[0]!.date).toUTCString()}</lastBuildDate>
    <atom:link href="${site}/feed.xml" rel="self" type="application/rss+xml"/>
    ${posts.map(renderItem).join("")}
  </channel>
</rss>
`;
}

export default function rss() {
  const published = publishedBlogs();

  if (published.length === 0) {
    console.log("RSS feed skipped: no published posts.");
    return;
  }

  writeFileSync("./public/feed.xml", renderFeed(published));
  console.log(`RSS feed generated (${published.length} items).`);
}
