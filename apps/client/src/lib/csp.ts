import { INLINE_SCRIPT_HASHES } from "@/generated/cspScriptHashes";

/**
 * The site's Content-Security-Policy, built per request.
 *
 * Getting rid of `script-src 'unsafe-inline'` is awkward in the App Router
 * because the inline scripts come from two different worlds:
 *
 *  - **Prerendered pages** (`/`, `/about`, every blog post). Their HTML is
 *    built once and served from cache, so a per-request nonce can never appear
 *    in it — Next only injects a nonce while it renders. These are covered by
 *    `'sha256-…'` hashes of the exact inline scripts the build emitted; see
 *    `src/scripts/cspScriptHashes.ts`.
 *  - **Server-rendered pages** (`/activity`, an un-prerendered `/link/[link]`,
 *    dev). Their inline scripts differ per request, so they get the nonce that
 *    `src/proxy.ts` mints and forwards on the request, which Next then stamps
 *    onto its own bootstrap scripts.
 *
 * Both sets are listed together: a script runs if it matches the nonce *or* a
 * hash, which is what makes one header work for a mixed static/dynamic app.
 * Note that naming either one makes browsers ignore `'unsafe-inline'`, so the
 * two cannot be mixed as a fallback.
 *
 * Production also names `/api/csp-report`, via `report-to` and — for browsers
 * that don't implement the Reporting API — `report-uri`. The browser sends
 * those itself; they are not page fetches, so `connect-src` stays `'self'`.
 * Dev omits them: the dev policy allows inline scripts, and a local page
 * should not report anywhere.
 */
export const CSP_REPORT_PATH = "/api/csp-report";
/** The `report-to` group. `Reporting-Endpoints` maps this name to a URL. */
export const CSP_REPORT_GROUP = "csp-endpoint";

// Embedded in the policy and in a structured header. A request origin that
// doesn't match is ignored and the path is used relative, so a crafted Host
// cannot add CSP directives or break out of the quoted endpoint URL.
const SAFE_ORIGIN =
  /^https:\/\/[a-zA-Z0-9.-]+(?::\d{1,5})?$|^http:\/\/(?:localhost|127\.0\.0\.1)(?::\d{1,5})?$/;

/** Absolute when `origin` is a plain https origin (or local http); else the path. */
export function cspReportUrl(origin?: string): string {
  if (origin && SAFE_ORIGIN.test(origin)) return `${origin}${CSP_REPORT_PATH}`;
  return CSP_REPORT_PATH;
}

/** Value of the `Reporting-Endpoints` response header. */
export function reportingEndpointsHeader(origin?: string): string {
  return `${CSP_REPORT_GROUP}="${cspReportUrl(origin)}"`;
}

export function contentSecurityPolicy({
  nonce,
  isDev = process.env.NODE_ENV !== "production",
  origin,
}: {
  nonce: string;
  isDev?: boolean;
  origin?: string;
}): string {
  // React Refresh compiles with `eval`, and the dev overlay's inline scripts
  // are not part of the production hash manifest. Dev is a local-only origin;
  // production is what this policy is for.
  const scriptSrc = isDev
    ? ["'self'", "'unsafe-inline'", "'unsafe-eval'"]
    : ["'self'", `'nonce-${nonce}'`, ...INLINE_SCRIPT_HASHES];

  const directives = [
    "default-src 'self'",
    `script-src ${scriptSrc.join(" ")}`,
    // Unlike scripts, inline styles stay allowed: Tailwind's runtime theme
    // switch and `next/font` both write `style` attributes, which no nonce can
    // reach. Tracked separately from this policy's script hardening.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ];
  if (!isDev) {
    directives.push(
      `report-uri ${cspReportUrl(origin)}`,
      `report-to ${CSP_REPORT_GROUP}`
    );
  }
  return directives.join("; ");
}

/** A fresh 128-bit nonce, base64-encoded as the CSP grammar requires. */
export function createNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}
