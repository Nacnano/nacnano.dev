import { NextResponse } from "next/server";
import { isActivityLive } from "@/lib/activity";
import { getActivityClient, recordVisit } from "@/lib/activityRedis";

// Recording a visit is a side effect on the request path; it is never baked in.
export const dynamic = "force-dynamic";

const MAX_PATH = 200;

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

export async function POST(request: Request) {
  // Static mode has nowhere to write, so a visit is acknowledged and dropped
  // rather than throwing at the caller's fetch.
  if (!isActivityLive() || !getActivityClient()) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });
  }

  const path = (body as { path?: unknown })?.path;
  const title = (body as { title?: unknown })?.title;
  if (typeof path !== "string" || path.length === 0 || path.length > MAX_PATH) {
    return NextResponse.json({ ok: false, error: "Invalid path" }, { status: 400 });
  }

  try {
    const recorded = await recordVisit({
      path,
      title: typeof title === "string" ? title : undefined,
      ...readGeo(request.headers),
    });
    return NextResponse.json({ ok: true, skipped: !recorded });
  } catch {
    // Never let a tracking failure surface as a page error.
    return NextResponse.json({ ok: true, skipped: true });
  }
}
