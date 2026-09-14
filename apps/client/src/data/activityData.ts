import type { ActivityEvent } from "@/lib/activityTypes";

/**
 * The static seed shown when the feed is not wired to a live store.
 *
 * Timestamps are fixed on purpose: this array is server-rendered into the page
 * and then hydrated on the client, so anything computed from the clock here
 * would differ between the two passes and trip a hydration mismatch. When the
 * site runs in live mode (see `isActivityLive`) the route handlers replace this
 * with events pulled from Redis, and these entries are never rendered.
 *
 * Coordinates are real city centroids so the globe places its markers where a
 * reader would expect. Swap in your own activity by editing the entries below —
 * every field except `id`, `ts`, `kind` and `summary` is optional.
 */
export const seedActivityEvents: ActivityEvent[] = [
  {
    id: "seed-01",
    ts: "2026-09-14T03:12:00.000Z",
    kind: "visit",
    summary: "visited Writing",
    source: "nacnano.dev",
    href: "/",
    countryCode: "TH",
    city: "Bangkok",
    lat: 13.7563,
    lng: 100.5018,
  },
  {
    id: "seed-02",
    ts: "2026-09-14T02:40:00.000Z",
    kind: "coffee",
    summary: "brewed a pour-over",
    source: "the kitchen",
  },
  {
    id: "seed-03",
    ts: "2026-09-13T18:05:00.000Z",
    kind: "visit",
    summary: "visited Projects",
    source: "nacnano.dev",
    href: "/projects",
    countryCode: "JP",
    city: "Tokyo",
    lat: 35.6762,
    lng: 139.6503,
  },
  {
    id: "seed-04",
    ts: "2026-09-13T15:22:00.000Z",
    kind: "like",
    summary: "liked a post about type on the web",
    source: "Bluesky",
    href: "https://bsky.app",
  },
  {
    id: "seed-05",
    ts: "2026-09-13T09:47:00.000Z",
    kind: "visit",
    summary: "visited Writing",
    source: "nacnano.dev",
    href: "/",
    countryCode: "DE",
    city: "Berlin",
    lat: 52.52,
    lng: 13.405,
  },
  {
    id: "seed-06",
    ts: "2026-09-12T21:30:00.000Z",
    kind: "starred",
    summary: "starred cobe, the globe behind this page",
    source: "GitHub",
    href: "https://github.com/cobe-gl/cobe",
    lat: 37.7749,
    lng: -122.4194,
  },
  {
    id: "seed-07",
    ts: "2026-09-12T11:03:00.000Z",
    kind: "read",
    summary: "read “The Writings of a Working Engineer”",
    source: "a queue I keep meaning to clear",
  },
  {
    id: "seed-08",
    ts: "2026-09-11T16:41:00.000Z",
    kind: "visit",
    summary: "visited About",
    source: "nacnano.dev",
    href: "/about",
    countryCode: "GB",
    city: "London",
    lat: 51.5072,
    lng: -0.1276,
  },
  {
    id: "seed-09",
    ts: "2026-09-11T08:19:00.000Z",
    kind: "published",
    summary: "published a note about static sites",
    source: "nacnano.dev",
    href: "/",
  },
  {
    id: "seed-10",
    ts: "2026-09-10T19:55:00.000Z",
    kind: "visit",
    summary: "visited Writing",
    source: "nacnano.dev",
    href: "/",
    countryCode: "US",
    city: "New York",
    lat: 40.7128,
    lng: -74.006,
  },
  {
    id: "seed-11",
    ts: "2026-09-10T12:12:00.000Z",
    kind: "listen",
    summary: "had a record on all afternoon",
    source: "the office",
  },
  {
    id: "seed-12",
    ts: "2026-09-09T22:48:00.000Z",
    kind: "shipped",
    summary: "shipped a fix to the course planner",
    source: "GitHub",
    href: "https://github.com/nacnano",
  },
  {
    id: "seed-13",
    ts: "2026-09-09T05:31:00.000Z",
    kind: "visit",
    summary: "visited Projects",
    source: "nacnano.dev",
    href: "/projects",
    countryCode: "SG",
    city: "Singapore",
    lat: 1.3521,
    lng: 103.8198,
  },
  {
    id: "seed-14",
    ts: "2026-09-08T14:07:00.000Z",
    kind: "visit",
    summary: "visited Writing",
    source: "nacnano.dev",
    href: "/",
    countryCode: "AU",
    city: "Sydney",
    lat: -33.8688,
    lng: 151.2093,
  },
];
