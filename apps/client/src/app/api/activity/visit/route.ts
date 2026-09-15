import { NextResponse } from "next/server";
import { isActivityLive, isInternalPath } from "@/lib/activity";
import { getActivityClient, recordVisit } from "@/lib/activityRedis";
import { allowVisit, clientIp, RETRY_AFTER_SECONDS } from "@/lib/rateLimit";
import { captureError } from "@/lib/observability";
import { resolveVisitTitle } from "@/lib/visitTitles";

// Recording a visit is a side effect on the request path; it is never baked in.
export const dynamic = "force-dynamic";

const MAX_PATH = 200;

/**
 * Parse an optional numeric header. `Number(null)` is `0` and `0` is finite, so
 * a naive `Number.isFinite` check would treat an absent (or empty) Vercel geo
 * header as latitude/longitude 0 — the "Null Island" off West Africa — and pin
 * a marker there for every local-dev or non-Vercel request. Absent or blank is
 * genuinely `undefined`, which leaves the visit geo-less rather than wrong.
 */
function parseCoordinate(value: string | null): number | undefined {
  if (value === null || value.trim() === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Decode Vercel's percent-encoded city header without letting a malformed escape
 * take down the whole visit. A bad `%`-sequence is a data-quality problem with
 * one field, not a reason to drop a legitimate page view, so it degrades to
 * "no city" rather than throwing. (Vercel overwrites these headers on the edge,
 * so they are trusted here only because the platform controls them; a non-Vercel
 * deployment must define a trusted-proxy boundary before accepting them.)
 */
function decodeCity(value: string | null): string | undefined {
  if (!value || value.trim() === "") return undefined;
  try {
    return decodeURIComponent(value);
  } catch {
    return undefined;
  }
}

function readGeo(headers: Headers) {
  // Vercel annotates every request with these. Absent elsewhere (local dev),
  // the visit is still recorded, just without a point on the globe. Country and
  // coordinates are bounded by the store's canonical schema on the way in.
  const country = headers.get("x-vercel-ip-country")?.trim() ?? undefined;
  return {
    countryCode: country,
    city: decodeCity(headers.get("x-vercel-ip-city")),
    lat: parseCoordinate(headers.get("x-vercel-ip-latitude")),
    lng: parseCoordinate(headers.get("x-vercel-ip-longitude")),
  };
}

export async function POST(request: Request) {
  // Static mode has nowhere to write, so a visit is acknowledged and dropped
  // rather than throwing at the caller's fetch.
  if (!isActivityLive() || !getActivityClient()) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  // Cap one visitor's writes before the body is even parsed, so the ceiling
  // holds against malformed and well-formed floods alike.
  const ip = clientIp(request.headers);
  if (!(await allowVisit(ip))) {
    return NextResponse.json(
      { ok: false, error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(RETRY_AFTER_SECONDS) } }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });
  }

  const path = (body as { path?: unknown })?.path;
  // A path is an identifier, not free text: it must be a bounded, well-formed
  // *internal* route. Anything else — absent, oversized, an absolute or
  // protocol-relative URL — is rejected, so nothing attacker-chosen can be
  // stored and later rendered as an outbound link in the public feed.
  if (
    typeof path !== "string" ||
    path.trim().length === 0 ||
    path.length > MAX_PATH ||
    !isInternalPath(path.trim())
  ) {
    return NextResponse.json({ ok: false, error: "Invalid path" }, { status: 400 });
  }

  // The title is never taken from the client (it is attacker-chosen text, and a
  // `document.title` read in an effect can lag a client-side navigation by one
  // page). We resolve it from our own content, keyed by the validated path.
  const normalizedPath = path.trim();
  const title = resolveVisitTitle(normalizedPath);

  try {
    const recorded = await recordVisit({
      path: normalizedPath,
      title,
      ...readGeo(request.headers),
    });
    return NextResponse.json({ ok: true, skipped: !recorded });
  } catch (error) {
    // A store failure is logged for the operator but never surfaces as a page
    // error — the beacon is fire-and-forget by design.
    captureError(error, { route: "activity/visit" });
    return NextResponse.json({ ok: true, skipped: true });
  }
}
