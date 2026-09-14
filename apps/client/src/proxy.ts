import { NextResponse, type NextRequest } from "next/server";

import { contentSecurityPolicy, createNonce } from "@/lib/csp";

/**
 * Owns the Content-Security-Policy header, which the static `headers()` block
 * in `next.config.js` cannot: the policy carries a per-request nonce.
 *
 * Setting it on the *request* as well as the response is what makes Next stamp
 * that nonce onto the inline scripts it emits while server-rendering.
 */
export function proxy(request: NextRequest) {
  const csp = contentSecurityPolicy({ nonce: createNonce() });

  const headers = new Headers(request.headers);
  headers.set("content-security-policy", csp);

  const response = NextResponse.next({ request: { headers } });
  response.headers.set("content-security-policy", csp);
  return response;
}

export const config = {
  // Build output and image assets are not documents; a script policy on them
  // costs a header per request and buys nothing.
  matcher: ["/((?!_next/static|_next/image|static/).*)"],
};
