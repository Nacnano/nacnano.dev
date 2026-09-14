/**
 * The single seam for surfacing errors to whoever operates the site.
 *
 * There is no APM account wired up, so this deliberately has no third-party
 * dependency: it always writes a structured line to the server log (which
 * Vercel drains) and, when `ERROR_REPORT_URL` is configured, fire-and-forgets
 * the same payload to that endpoint. Point it at Sentry, Better Stack, or a
 * Slack webhook without touching call sites. It never throws and never blocks
 * the request that failed.
 */

type Context = Record<string, unknown>;

// This MUST stay non-`NEXT_PUBLIC_`. The module is imported by `error.tsx` /
// `global-error.tsx` (client), and only the missing `NEXT_PUBLIC_` prefix keeps
// Next from inlining the real URL into the browser bundle — renaming it would
// leak the reporting endpoint to every visitor.
const endpoint = process.env.ERROR_REPORT_URL;

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

/** Report an unexpected error. Safe from both the server and the browser. */
export function captureError(error: unknown, context: Context = {}): void {
  const payload = { ...context, ...serialize(error) };

  // The log is the reliable sink on a serverless deploy.
  console.error("[error]", JSON.stringify(payload));

  const isServer = typeof window === "undefined";
  if (!isServer || !endpoint) return;

  try {
    void fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(() => {
      /* a failed report must never surface */
    });
  } catch {
    /* never let reporting break the caller */
  }
}