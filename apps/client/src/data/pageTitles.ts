/**
 * The one source of truth for section-page titles.
 *
 * Each page feeds these to `genPageMetaData`, and the activity feed's
 * server-side title resolver reads the same constants. Keeping them here is
 * what stops a page's title and its feed label from drifting apart — a rename
 * is one edit, and there is no copy in the feed to go stale.
 */
export const PAGE_TITLES = {
  about: "About",
  projects: "Things I've made",
  link: "Links",
  activity: "Activity",
  privacy: "Privacy",
} as const;

export type PageTitleKey = keyof typeof PAGE_TITLES;
