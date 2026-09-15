import { NextResponse } from "next/server";
import { allowReport, clientIp } from "@/lib/rateLimit";
import { captureError } from "@/lib/observability";

/**
 * `POST /api/report` — the browser's egress for errors it cannot log to a server
 * drain on its own.
 *
 * `error.tsx` / `global-error.tsx` run in the visitor's browser, where the
 * reporting endpoint is deliberately *not* present (it must stay out of the
 * bundle) and `connect-src` is locked to `'self'`. So the client cannot POST to
 * the operator's webhook directly. This route is the same-origin hop: the client
 * ships a bounded, secret-free copy of the error here, and the *server* — which
 * does hold `ERROR_REPORT_URL` — forwards it via `captureError`. It is a
 * same-origin `fetch`, so the shipped `connect-src 'self'` already covers it and
 * the CSP does not change (the argument `ama/actions.ts` makes for its action).
 *
 * It never reveals whether it accepted: every response is a bare `204`, so a
 * probe learns nothing about the limiter or the sink behind it.
 */
export const dynamic = "force-dynamic";

const MAX_BODY = 8_000;
const MAX_TEXT = 80;
const MAX_MESSAGE = 2_000;
const MAX_DIGEST = 64;
const MAX_URL = 500;

function bounded(value: unknown, max: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > max) return undefined;
  return trimmed;
}

// A synthetic error so `captureError`'s serializer produces a *server*-generated
// stack for the operator's log; the client's own `stack` is never read (it would
// land attacker-influenced text in the log/webhook).
function rebuild(name: string | undefined, message: string): Error {
  const error = new Error(message);
  if (name) error.name = name;
  return error;
}

export async function POST(request: Request): Promise<Response> {
  // Throttle first, so a flood is bounded before anything is parsed. Fails open
  // (see `allowReport`), so an Upstash outage never turns reporting into a 5xx.
  const ip = clientIp(request.headers);
  if (!(await allowReport(ip))) return new NextResponse(null, { status: 204 });

  let body: unknown;
  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY) return new NextResponse(null, { status: 204 });
    body = raw ? JSON.parse(raw) : null;
  } catch {
    return new NextResponse(null, { status: 204 });
  }

  const record = (body && typeof body === "object" ? body : {}) as Record<
    string,
    unknown
  >;
  const message = bounded(record.message, MAX_MESSAGE);
  const name = bounded(record.name, MAX_TEXT);
  // Nothing recognisable to report: still a success, still no signal.
  if (!message && !name) return new NextResponse(null, { status: 204 });

  // Re-derived, bounded fields only — `stack` is deliberately never forwarded.
  captureError(rebuild(name, message ?? ""), {
    scope: bounded(record.scope, MAX_TEXT) ?? "client-report",
    ...(bounded(record.digest, MAX_DIGEST)
      ? { digest: bounded(record.digest, MAX_DIGEST) }
      : {}),
    ...(bounded(record.url, MAX_URL) ? { url: bounded(record.url, MAX_URL) } : {}),
    source: "browser",
  });

  return new NextResponse(null, { status: 204 });
}
