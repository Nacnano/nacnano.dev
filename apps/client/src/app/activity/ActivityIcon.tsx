import type { ActivityKind } from "@/lib/activityTypes";

/**
 * One glyph per activity kind, drawn in the same 24px stroked style as the
 * rest of the site's icons so the feed never introduces a second visual voice.
 */
const paths: Record<ActivityKind, React.ReactNode> = {
  visit: (
    <>
      <path d="M3 3l7.5 17 2.5-7 7-2.5z" />
    </>
  ),
  like: <path d="M12 20s-7-4.35-9.5-8.5C1 8.5 2.5 5 6 5c2 0 3 1.5 6 4 3-2.5 4-4 6-4 3.5 0 5 3.5 3.5 6.5C19 15.65 12 20 12 20z" />,
  read: (
    <>
      <path d="M4 5.5A2.5 2.5 0 016.5 3H12v16H6.5A2.5 2.5 0 004 21.5z" />
      <path d="M20 5.5A2.5 2.5 0 0017.5 3H12v16h5.5a2.5 2.5 0 012.5 2.5z" />
    </>
  ),
  listen: (
    <>
      <path d="M4 14v-2a8 8 0 0116 0v2" />
      <path d="M4 14a2 2 0 002 2h1v-5H6a2 2 0 00-2 2zM20 14a2 2 0 01-2 2h-1v-5h1a2 2 0 012 2z" />
    </>
  ),
  published: (
    <>
      <path d="M4 20l4-1L20 7l-3-3L5 16z" />
      <path d="M14 6l3 3" />
    </>
  ),
  starred: <path d="M12 3l2.6 5.6 6.1.7-4.5 4.1 1.2 6-5.4-3-5.4 3 1.2-6L3.3 9.3l6.1-.7z" />,
  shipped: (
    <>
      <path d="M12 3c3 2 5 5 5 9l-3 3h-4l-3-3c0-4 2-7 5-9z" />
      <path d="M9 18l-2 3M15 18l2 3M12 15v6" />
    </>
  ),
  coffee: (
    <>
      <path d="M4 8h13v6a4 4 0 01-4 4H8a4 4 0 01-4-4z" />
      <path d="M17 9h2a2 2 0 010 4h-2M6 3v2M10 3v2M14 3v2" />
    </>
  ),
};

export default function ActivityIcon({ kind }: { kind: ActivityKind }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      {paths[kind] ?? paths.visit}
    </svg>
  );
}