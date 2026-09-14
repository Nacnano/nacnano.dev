import { describe, it, expect } from "bun:test";
import {
  AMA_CHANNEL,
  BLOG_CHANNEL,
  amaFeedItems,
  blogFeedItems,
  renderFeed,
  renderItem,
  type FeedItem,
} from "./rss";
import siteMetadata from "@/data/siteMetadata";
import { publishedAma } from "@/lib/ama";

const item: FeedItem = {
  url: `${siteMetadata.siteUrl}/blogs/hello`,
  title: "A & B <tag>",
  date: "2026-01-02T00:00:00.000Z",
  description: "The summary",
  categories: ["t1", "t2"],
};

describe("RSS renderer", () => {
  it("escapes XML-special characters so a title can't break the feed", () => {
    const xml = renderItem(item);
    expect(xml).toContain("A &amp; B &lt;tag&gt;");
  });

  it("emits one category per tag", () => {
    const xml = renderItem(item);
    expect(xml).toContain("<category>t1</category>");
    expect(xml).toContain("<category>t2</category>");
  });

  it("dates the channel from the newest item", () => {
    expect(renderFeed([item], BLOG_CHANNEL)).toContain(new Date(item.date).toUTCString());
  });

  it("points the atom:link self reference at the channel's own path", () => {
    expect(renderFeed([item], BLOG_CHANNEL)).toContain(
      `href="${siteMetadata.siteUrl}/feed.xml"`
    );
    expect(renderFeed([item], AMA_CHANNEL)).toContain(
      `href="${siteMetadata.siteUrl}/ama/rss.xml"`
    );
  });

  it("still renders a valid channel when there are no items", () => {
    const xml = renderFeed([], BLOG_CHANNEL);
    expect(xml).toContain("<rss");
    expect(xml).toContain("</channel>");
    expect(xml).toContain("</rss>");
  });
});

describe("blog feed items", () => {
  it("links items to the /blogs/ prefix, not the old /blog/ route", () => {
    const urls = blogFeedItems().map((i) => i.url);
    expect(urls.length).toBeGreaterThan(0);
    for (const url of urls) expect(url).toStartWith(`${siteMetadata.siteUrl}/blogs/`);
  });
});

describe("AMA feed items", () => {
  it("carries every published answer, newest first, one item per question", () => {
    const entries = publishedAma();
    const items = amaFeedItems();
    expect(items.map((i) => i.title)).toEqual(entries.map((e) => e.question));
  });

  it("gives each item a unique guid anchored at the answer on /ama", () => {
    const items = amaFeedItems();
    const urls = items.map((i) => i.url);
    expect(new Set(urls).size).toBe(urls.length);
    for (const url of urls) {
      expect(url).toStartWith(`${siteMetadata.siteUrl}/ama#`);
    }
  });

  it("delivers the answer as readable text, not raw markdown", () => {
    const rendered = renderFeed(
      amaFeedItems().length > 0
        ? amaFeedItems()
        : [{ url: "u", title: "t", date: item.date, description: "**bold** [x](y)" }],
      AMA_CHANNEL
    );
    // Whatever the current content is, no markdown emphasis or link syntax may
    // reach a reader — mdToPlainText is the strip, asserted here at the seam.
    expect(rendered).not.toContain("**");
    expect(rendered).not.toMatch(/\]\(/);
  });
});
