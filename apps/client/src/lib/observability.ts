/**
 * The single seam for surfacing errors to whoever operates the site.
 *
 * There is no APM account wired up, so this deliberately has no third-party
 * dependency: it always writes a structured line to the server log (which
 * Vercel drains) and then forwards the same payload — server-side to
 * `ERROR_REPORT_URL` when configured, and browser-side to our own
 * `POST /api/report`, which re-derives a bounded copy and forwards it onward.
 * Point the server endpoint at Better Stack, Slack, or any webhook without
 * touching call sites. It never throws and never blocks the request that failed.
 */

type Context = Record<string, unknown>;

// The browser's destination: our own origin, so the shipped `connect-src 'self'`
// covers it with no CSP change — the same same-origin argument `ama/actions.ts`
// makes for its server action. The real endpoint never travels to the client.
const REPORT_PATH = "/api/report";

// Matched to the convention `discord.ts` and `amaNotify.ts` already hold: a
// fire-and-forget report must never hang a request, and must not keep a
// serverless function alive waiting on an unresponsive peer.
const TIMEOUT_MS = 2_000;

/**
 * A server-side delivery hook, registered once at boot by `instrumentation.ts`.
 *
 * Kept as an injected function pointer rather than an import so this module —
 * which the client error boundaries also pull in — never statically depends on a
 * `server-only` transport (`discord.ts`). The sink is a no-op until the server
 * registers one, so the browser bundle and static deploys are unaffected.
 */
export type ReportSink = (payload: Record<string, unknown>) => void;
let reportSink: ReportSink | null = null;

export function setReportSink(sink: ReportSink | null): void {
  reportSink = sink;
}

function serialize(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }
  return { message: String(error) };
}

// A report must never loop. If `ERROR_REPORT_URL` were pointed back at our own
// `/api/report` (an operator footgun), the server handler would call
// `captureError`, which would POST to `/api/report` again — a self-sustaining
// fan-out of outbound traffic, the exact failure mode `activityRedis` guards
// against for corrupt rows. This flag short-circuits a re-entrant call made
// while a dispatch is in flight, mirroring that de-dup discipline.
let reporting = false;

function dispatch(url: string, body: Record<string, unknown>): void {
  void fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    // `keepalive` lets the browser report survive the page unloading around an
    // error boundary; ignored on the server.
    keepalive: true,
    signal: AbortSignal.timeout(TIMEOUT_MS),
  }).catch(() => {
    /* a failed report must never surface */
  });
}

/** Report an unexpected error. Safe from both the server and the browser. */
export function captureError(error: unknown, context: Context = {}): void {
  if (reporting) return;

  const serialized = serialize(error);
  const payload = { ...context, ...serialized };

  // The log is the reliable sink on a serverless deploy.
  console.error("[error]", JSON.stringify(payload));

  const isServer = typeof window === "undefined";

  reporting = true;
  try {
    if (isServer) {
      // Read lazily (not at module scope) so a runtime that sets the env after
      // boot — and the unit tests — actually reach it. This read stays non-
      // `NEXT_PUBLIC_`: the missing prefix is what keeps Next from inlining the
      // real URL into the browser bundle, so renaming it would leak the
      // reporting endpoint to every visitor. (On the client this expression is
      // statically replaced with `undefined`, and the browser branch below is
      // taken anyway.)
      const endpoint = process.env.ERROR_REPORT_URL;
      if (endpoint) dispatch(endpoint, payload);
      // Also hand the payload to any server-registered sink (e.g. Discord, wired
      // in `instrumentation.ts`). It self-checks configuration and de-dupes, so
      // this is a no-op on a static deploy with nothing configured.
      reportSink?.(payload);
    } else {
      // Ship only bounded, non-secret fields to our own origin. `stack` is
      // deliberately withheld — it is attacker-influenced text (a thrown
      // message can embed request data) and the server re-derives its own;
      // forwarding a client stack would put arbitrary text in the operator's
      // log. `url` is the page it happened on, read here rather than trusted
      // from the body.
      dispatch(REPORT_PATH, {
        name: serialized.name,
        message: serialized.message,
        scope: context.scope,
        digest: context.digest,
        url: typeof location !== "undefined" ? location.href : undefined,
      });
    }
  } catch {
    /* never let reporting break the caller */
  } finally {
    reporting = false;
  }
}
