/**
 * The blog layout registry, as a plain list of names.
 *
 * The content loader validates frontmatter `layout` against this so an unknown
 * (or mis-typed) layout is a build failure naming the file — rather than
 * `resolveLayout`'s silent fallback to the default layout, which is exactly the
 * "renders oddly, no signal" class this validation exists to kill.
 *
 * Keep in sync with the `layouts` component map in
 * `app/blogs/[...slug]/page.tsx`; adding a layout means adding its name here and
 * its component there.
 */
export const LAYOUT_NAMES = ["BlogWithDetail"] as const;

export type LayoutName = (typeof LAYOUT_NAMES)[number];
