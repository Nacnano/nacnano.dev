import { describe, it, expect } from "bun:test";
import { renderItem, renderFeed } from "./rss";
import type { Blog } from "@/lib/content";
import siteMetadata from "@/data/siteMetadata";

type FeedPost = Pick<Blog, "slug" | "title" | "date" | "summary" | "tags">;

const post: FeedPost = {
  slug: "hello",
  title: "A & B <tag>",
  date: "2026-01-02T00:00:00.000Z",
  summary: "The summary",
  tags: ["t1", "t2"],
};

describe("RSS renderer", () => {
  it("escapes XML-special characters so a title can't break the feed", () => {
    const xml = renderItem(post);
    expect(xml).toContain("A &amp; B &lt;tag&gt;");
  });

  it("links items to the /blogs/ prefix, not the old /blog/ route", () => {
    expect(renderItem(post)).toContain(`${siteMetadata.siteUrl}/blogs/hello`);
  });

  it("emits one category per tag", () => {
    const xml = renderItem(post);
    expect(xml).toContain("<category>t1</category>");
    expect(xml).toContain("<category>t2</category>");
  });

  it("dates the channel from the newest post", () => {
    expect(renderFeed([post])).toContain(new Date(post.date).toUTCString());
  });

  it("still renders a valid channel when there are no posts", () => {
    const xml = renderFeed([]);
    expect(xml).toContain("<rss");
    expect(xml).toContain("</channel>");
    expect(xml).toContain("</rss>");
  });
});
