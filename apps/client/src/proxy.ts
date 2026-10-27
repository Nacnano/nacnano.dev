import { NextResponse, type NextRequest } from "next/server";

import { contentSecurityPolicy, createNonce, reportingEndpointsHeader } from "@/lib/csp";

/**
 * Owns the Content-Security-Policy header, which the static `headers()` block
 * in `next.config.js` cannot: the policy carries a per-request nonce.
 *
 * Setting it on the *request* as well as the response is what makes Next stamp
 * that nonce onto the inline scripts it emits while server-rendering.
 * `Reporting-Endpoints` is response-only: it is the URL `report-to` names,
 * and Next does not read it.
 */
export function proxy(request: NextRequest) {
  const isDev = process.env.NODE_ENV !== "production";
  const origin = request.nextUrl.origin;
  const csp = contentSecurityPolicy({ nonce: createNonce(), isDev, origin });

  const headers = new Headers(request.headers);
  headers.set("content-security-policy", csp);

  const response = NextResponse.next({ request: { headers } });
  response.headers.set("content-security-policy", csp);
  if (!isDev) {
    response.headers.set("Reporting-Endpoints", reportingEndpointsHeader(origin));
  }
  return response;
}

export const config = {
  // Build output and image assets are not documents; a script policy on them
  // costs a header per request and buys nothing.
  matcher: ["/((?!_next/static|_next/image|static/).*)"],
};
