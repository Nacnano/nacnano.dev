/**
 * Pure helpers for ordering posts and finding a post's neighbours.
 *
 * These live outside the route components on purpose: the adjacency rule has
 * been wrong in production before (prev/next were inverted, so "Previous"
 * walked forward in time), and the only way to keep that fixed is to be able
 * to test it.
 */

export type DatedPost = {
  slug: string;
  date: string;
  draft?: boolean;
};

/** Newest first. Ties keep their original relative order. */
export function sortByDateDesc<T extends DatedPost>(posts: readonly T[]): T[] {
  return [...posts].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

export function publishedOnly<T extends DatedPost>(posts: readonly T[]): T[] {
  return posts.filter((post) => post.draft !== true);
}

/**
 * Neighbours of `slug` in a newest-first list.
 *
 * In a newest-first array the *lower* index is the more recent post, so
 * `newer` is `index - 1` and `older` is `index + 1`. Getting this backwards is
 * the bug this module exists to prevent.
 */
export function getAdjacentPosts<T extends DatedPost>(
  sortedNewestFirst: readonly T[],
  slug: string
): { index: number; newer?: T; older?: T } {
  const index = sortedNewestFirst.findIndex((post) => post.slug === slug);
  if (index === -1) return { index: -1 };
  return {
    index,
    newer: sortedNewestFirst[index - 1],
    older: sortedNewestFirst[index + 1],
  };
}
