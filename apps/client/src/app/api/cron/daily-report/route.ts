import { NextResponse } from "next/server";
import { sendDailyActivityReport } from "@/lib/activityReport";
import { captureError } from "@/lib/observability";

/**
 * `GET /api/cron/daily-report` — the daily activity summary, posted as the
 * Discord bot.
 *
 * Vercel Cron (see `crons` in `vercel.json`) is the caller, and the route
 * accepts nothing else: when `CRON_SECRET` is set on the project, Vercel sends
 * `Authorization: Bearer <CRON_SECRET>` with every cron request, and that is
 * the whole contract. The route is *closed* rather than open when the secret
 * is missing — this endpoint posts DMs to the owner, so an unauthenticated
 * public trigger would be a spam vector, and "forgets to set the secret" must
 * not read as "leaves the door open". The manual path is
 * `bun run activity:report`, which calls the same library function directly.
 *
 * No rate limiter in front of the auth check: an unauthenticated request
 * costs one constant-time digest comparison and a 401, and the secret itself
 * carries the entropy — the same reasoning that leaves `/api/health`
 * unthrottled.
 */
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

/**
 * Compare the presented token to the secret as SHA-256 digests, combined in a
 * fixed-length XOR fold: no length or content early-exit leaks through the
 * comparison, and `crypto.subtle` (not `node:crypto`) keeps the server code
 * runtime-agnostic, as in `rateLimit.ts`.
 */
export async function matchesCronSecret(
  provided: string,
  expected: string
): Promise<boolean> {
  const encoder = new TextEncoder();
  const [presented, actual] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(provided)),
    crypto.subtle.digest("SHA-256", encoder.encode(expected)),
  ]);
  const a = new Uint8Array(presented);
  const b = new Uint8Array(actual);
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return diff === 0;
}

async function isCronRequest(request: Request, secret: string): Promise<boolean> {
  const auth = request.headers.get("authorization") ?? "";
  const prefix = "Bearer ";
  if (!auth.startsWith(prefix)) return false;
  return matchesCronSecret(auth.slice(prefix.length), secret);
}

export async function GET(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    // A broken schedule, not an attack — but it is reported to the server log
    // rather than the Discord bot, because the bot *is* the thing this route
    // would have used, and a misconfigured daily job should not also become a
    // daily error alert. Vercel surfaces the failed cron run itself.
    console.warn(
      JSON.stringify({ scope: "cron/daily-report", error: "CRON_SECRET is not set" })
    );
    return NextResponse.json(
      { ok: false, error: "not_configured" },
      { status: 503, headers: NO_STORE }
    );
  }

  if (!(await isCronRequest(request, secret))) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401, headers: NO_STORE }
    );
  }

  try {
    const outcome = await sendDailyActivityReport();
    // 200 even when `sent` is false: the run completed and said why (skipped
    // or refused); only an exception makes the cron job itself look failed,
    // which is the signal for "go look at the logs", not for "Discord said no".
    return NextResponse.json({ ok: true, ...outcome }, { headers: NO_STORE });
  } catch (error) {
    // The store threw (a partial/weak live config, or an Upstash outage). The
    // report lands in the operator's error alerts — the same bot, per the
    // README — so a silently missing daily report is still a visible failure.
    captureError(error, { scope: "cron/daily-report" });
    return NextResponse.json(
      { ok: false, error: "report_failed" },
      { status: 503, headers: NO_STORE }
    );
  }
}
