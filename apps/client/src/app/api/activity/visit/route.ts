import { NextResponse } from "next/server";
import { isActivityLive } from "@/lib/activity";
import { getActivityClient, recordVisit } from "@/lib/activityRedis";
import { allowVisit, clientIp, RETRY_AFTER_SECONDS } from "@/lib/rateLimit";
import { captureError } from "@/lib/observability";

// Recording a visit is a side effect on the request path; it is never baked in.
export const dynamic = "force-dynamic";

const MAX_PATH = 200;
const MAX_TITLE = 200;

function readGeo(headers: Headers) {
  // Vercel annotates every request with these. Absent elsewhere (local dev),
  // the visit is still recorded, just without a point on the globe.
  const country = headers.get("x-vercel-ip-country") ?? undefined;
  const cityHeader = headers.get("x-vercel-ip-city");
  const lat = Number(headers.get("x-vercel-ip-latitude"));
  const lng = Number(headers.get("x-vercel-ip-longitude"));
  return {
    countryCode: country,
    city: cityHeader ? decodeURIComponent(cityHeader) : undefined,
    lat: Number.isFinite(lat) ? lat : undefined,
    lng: Number.isFinite(lng) ? lng : undefined,
  };
}

/** Clamp an optional free-text field to a bounded, trimmed string. */
function bounded(value: unknown, max: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, max);
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
  const title = bounded((body as { title?: unknown })?.title, MAX_TITLE);
  // A path is an identifier, not free text: reject anything absent or oversized
  // rather than writing a truncated, plausible-looking fake into the feed.
  if (typeof path !== "string" || path.trim().length === 0 || path.length > MAX_PATH) {
    return NextResponse.json({ ok: false, error: "Invalid path" }, { status: 400 });
  }

  try {
    const recorded = await recordVisit({
      path: path.trim(),
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