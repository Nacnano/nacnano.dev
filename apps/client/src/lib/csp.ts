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
 */
export function contentSecurityPolicy({
  nonce,
  isDev = process.env.NODE_ENV !== "production",
}: {
  nonce: string;
  isDev?: boolean;
}): string {
  // React Refresh compiles with `eval`, and the dev overlay's inline scripts
  // are not part of the production hash manifest. Dev is a local-only origin;
  // production is what this policy is for.
  const scriptSrc = isDev
    ? ["'self'", "'unsafe-inline'", "'unsafe-eval'"]
    : ["'self'", `'nonce-${nonce}'`, ...INLINE_SCRIPT_HASHES];

  return [
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
  ].join("; ");
}

/** A fresh 128-bit nonce, base64-encoded as the CSP grammar requires. */
export function createNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}
