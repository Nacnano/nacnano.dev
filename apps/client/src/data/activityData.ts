import type { VisitEvent } from "@/lib/activityTypes";

/**
 * The static seed of site visits, shown when the feed is not wired to a live
 * store.
 *
 * Timestamps are fixed on purpose: this array is server-rendered into the page
 * and then hydrated on the client, so anything computed from the clock here
 * would differ between the two passes and trip a hydration mismatch. When the
 * site runs in live mode (see `isActivityLive`) the route handlers replace this
 * with visits pulled from Redis, and these entries are never rendered.
 *
 * Coordinates are real city centroids so the globe places its markers where a
 * reader expects. A few countries repeat so the aggregation (marker sizes, the
 * country tally, most-viewed pages) has something to show.
 */
export const seedVisits: VisitEvent[] = [
  { id: "v01", ts: "2026-09-14T03:12:00.000Z", page: "/", title: "Writing", countryCode: "TH", city: "Bangkok", lat: 13.7563, lng: 100.5018 },
  { id: "v02", ts: "2026-09-14T02:47:00.000Z", page: "/projects", title: "Projects", countryCode: "TH", city: "Bangkok", lat: 13.7563, lng: 100.5018 },
  { id: "v03", ts: "2026-09-14T01:30:00.000Z", page: "/", title: "Writing", countryCode: "US", city: "New York", lat: 40.7128, lng: -74.006 },
  { id: "v04", ts: "2026-09-13T22:05:00.000Z", page: "/blogs", title: "Writing", countryCode: "JP", city: "Tokyo", lat: 35.6762, lng: 139.6503 },
  { id: "v05", ts: "2026-09-13T18:41:00.000Z", page: "/activity", title: "Activity", countryCode: "DE", city: "Berlin", lat: 52.52, lng: 13.405 },
  { id: "v06", ts: "2026-09-13T15:22:00.000Z", page: "/", title: "Writing", countryCode: "US", city: "San Francisco", lat: 37.7749, lng: -122.4194 },
  { id: "v07", ts: "2026-09-13T09:47:00.000Z", page: "/projects", title: "Projects", countryCode: "GB", city: "London", lat: 51.5072, lng: -0.1276 },
  { id: "v08", ts: "2026-09-12T21:30:00.000Z", page: "/", title: "Writing", countryCode: "SG", city: "Singapore", lat: 1.3521, lng: 103.8198 },
  { id: "v09", ts: "2026-09-12T16:12:00.000Z", page: "/about", title: "About", countryCode: "TH", city: "Chiang Mai", lat: 18.7883, lng: 98.9853 },
  { id: "v10", ts: "2026-09-12T11:03:00.000Z", page: "/", title: "Writing", countryCode: "FR", city: "Paris", lat: 48.8566, lng: 2.3522 },
  { id: "v11", ts: "2026-09-11T19:55:00.000Z", page: "/projects", title: "Projects", countryCode: "US", city: "New York", lat: 40.7128, lng: -74.006 },
  { id: "v12", ts: "2026-09-11T08:19:00.000Z", page: "/blogs", title: "Writing", countryCode: "AU", city: "Sydney", lat: -33.8688, lng: 151.2093 },
  { id: "v13", ts: "2026-09-10T23:44:00.000Z", page: "/", title: "Writing", countryCode: "CA", city: "Toronto", lat: 43.6532, lng: -79.3832 },
  { id: "v14", ts: "2026-09-10T14:07:00.000Z", page: "/about", title: "About", countryCode: "NL", city: "Amsterdam", lat: 52.3676, lng: 4.9041 },
  { id: "v15", ts: "2026-09-09T19:31:00.000Z", page: "/", title: "Writing", countryCode: "KR", city: "Seoul", lat: 37.5665, lng: 126.978 },
  { id: "v16", ts: "2026-09-09T05:31:00.000Z", page: "/projects", title: "Projects", countryCode: "SG", city: "Singapore", lat: 1.3521, lng: 103.8198 },
  { id: "v17", ts: "2026-09-08T22:20:00.000Z", page: "/blogs", title: "Writing", countryCode: "BR", city: "São Paulo", lat: -23.5505, lng: -46.6333 },
  { id: "v18", ts: "2026-09-08T14:07:00.000Z", page: "/", title: "Writing", countryCode: "NG", city: "Lagos", lat: 6.5244, lng: 3.3792 },
];
