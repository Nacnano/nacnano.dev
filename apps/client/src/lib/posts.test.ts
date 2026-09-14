import { describe, expect, it } from "bun:test";
import { getAdjacentPosts, publishedOnly, sortByDateDesc } from "./posts";

const posts = [
  { slug: "oldest", date: "2022-01-01" },
  { slug: "middle", date: "2023-06-01" },
  { slug: "newest", date: "2024-03-01" },
];

describe("sortByDateDesc", () => {
  it("puts the newest post first", () => {
    expect(sortByDateDesc(posts).map((p) => p.slug)).toEqual([
      "newest",
      "middle",
      "oldest",
    ]);
  });

  it("does not mutate its input", () => {
    const input = [...posts];
    sortByDateDesc(input);
    expect(input.map((p) => p.slug)).toEqual(["oldest", "middle", "newest"]);
  });
});

describe("publishedOnly", () => {
  it("drops drafts and keeps everything else", () => {
    const mixed = [
      { slug: "a", date: "2024-01-01" },
      { slug: "b", date: "2024-01-02", draft: true },
      { slug: "c", date: "2024-01-03", draft: false },
    ];
    expect(publishedOnly(mixed).map((p) => p.slug)).toEqual(["a", "c"]);
  });
});

describe("getAdjacentPosts", () => {
  const sorted = sortByDateDesc(posts); // newest, middle, oldest

  it("treats the lower index as the newer post", () => {
    // The regression this guards: `newer` must be more recent than the
    // current post, not older than it.
    const { newer, older } = getAdjacentPosts(sorted, "middle");
    expect(newer?.slug).toBe("newest");
    expect(older?.slug).toBe("oldest");
    expect(new Date(newer!.date).getTime()).toBeGreaterThan(
      new Date("2023-06-01").getTime()
    );
    expect(new Date(older!.date).getTime()).toBeLessThan(
      new Date("2023-06-01").getTime()
    );
  });

  it("has no newer post at the top of the list", () => {
    const { newer, older } = getAdjacentPosts(sorted, "newest");
    expect(newer).toBeUndefined();
    expect(older?.slug).toBe("middle");
  });

  it("has no older post at the bottom of the list", () => {
    const { newer, older } = getAdjacentPosts(sorted, "oldest");
    expect(newer?.slug).toBe("middle");
    expect(older).toBeUndefined();
  });

  it("reports a missing slug rather than guessing", () => {
    expect(getAdjacentPosts(sorted, "nope").index).toBe(-1);
  });

  it("handles a single-post archive", () => {
    const one = [{ slug: "only", date: "2024-01-01" }];
    const { newer, older, index } = getAdjacentPosts(one, "only");
    expect(index).toBe(0);
    expect(newer).toBeUndefined();
    expect(older).toBeUndefined();
  });
});
