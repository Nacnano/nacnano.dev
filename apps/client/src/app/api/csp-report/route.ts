import { NextResponse } from "next/server";
import { describeCspViolation, parseCspReports } from "@/lib/cspReport";
import { captureError } from "@/lib/observability";
import { allowReport, clientIp } from "@/lib/rateLimit";

/**
 * `POST /api/csp-report` — where the browser sends a Content-Security-Policy
 * violation.
 *
 * The policy names this path (`report-uri` and `report-to`). The browser
 * posts here on its own, with no page script involved, and `connect-src`
 * does not apply to that post. This route is the same-origin hop `/api/report`
 * is: the visitor's browser can't hold the Discord token, so the server
 * forwards a bounded description through `captureError`, which already
 * delivers to Discord.
 *
 * It shares `/api/report`'s rate limit and the untrusted Discord budget
 * (`source: "browser"`). A flood of forged reports must not crowd out the
 * server-side alerts. Every response is a bare 204, including rejects, so a
 * probe learns nothing about the limiter or the sink.
 */
export const dynamic = "force-dynamic";

/** A report carries the whole policy. A batch of them is still small. */
const MAX_BODY = 64_000;
/** One request cannot spend the whole untrusted Discord budget by itself. */
const MAX_PER_REQUEST = 5;

function noContent(): Response {
  return new NextResponse(null, { status: 204 });
}

export async function POST(request: Request): Promise<Response> {
  // Throttle first, so a flood is bounded before anything is parsed. Fails
  // open (see `allowReport`): an Upstash outage must not turn this into a 5xx
  // the next report would then try to describe.
  const ip = clientIp(request.headers);
  if (!(await allowReport(ip))) return noContent();

  let payload: unknown;
  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY) return noContent();
    payload = raw ? JSON.parse(raw) : null;
  } catch {
    return noContent();
  }

  for (const violation of parseCspReports(payload).slice(0, MAX_PER_REQUEST)) {
    captureError(new Error(describeCspViolation(violation)), {
      scope: "csp-violation",
      source: "browser",
      ...(violation.documentUrl ? { url: violation.documentUrl } : {}),
    });
  }

  return noContent();
}
