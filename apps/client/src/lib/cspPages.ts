/**
 * Which URLs `verify:csp` fetches.
 *
 * Two sources, because the two runs of the script don't have the same files
 * on disk. After a local `next build` the prerendered HTML is right there.
 * After a deploy it isn't: the GitHub job that hits the live site checks out
 * the commit and does not build, and building wouldn't help anyway — the HTML
 * that matters is the HTML the host served. That run reads `/sitemap.xml`
 * from the site it is checking.
 */

/** Documents the sitemap leaves out, added on top of whichever source ran.
 *
 * `/activity` is rendered per request, so no prerendered file names it.
 * The last entry is not a route: requesting it is how the `_not-found`
 * document is reached.
 */
export const EXTRA_CSP_ROUTES = ["/activity", "/this-page-does-not-exist"];

const LOC = /<loc>\s*([^<\s]+)\s*<\/loc>/gi;

/** Pathnames from a sitemap document. Locs on another origin are dropped. */
export function routesFromSitemap(xml: string, base: string): string[] {
  const origin = new URL(base).origin;
  const routes: string[] = [];
  for (const match of xml.matchAll(LOC)) {
    const raw = match[1];
    if (!raw) continue;
    let url: URL;
    try {
      url = new URL(raw, base);
    } catch {
      continue;
    }
    if (url.origin !== origin) continue;
    // `new URL` keeps a trailing slash on the pathname. The site doesn't
    // serve trailing-slash URLs, and `"/".replace(...)` would become `""`.
    // A broken `%` escape would throw out of `decodeURIComponent` and fail
    // the whole run on one bad loc; skip that loc instead.
    let pathname: string;
    try {
      pathname = decodeURIComponent(url.pathname).replace(/\/$/, "") || "/";
    } catch {
      continue;
    }
    routes.push(pathname);
  }
  return routes;
}

/** Discovered routes plus {@link EXTRA_CSP_ROUTES}, in that order, once each. */
export function routesToCheck(discovered: readonly string[]): string[] {
  const seen = new Set<string>();
  const routes: string[] = [];
  for (const route of [...discovered, ...EXTRA_CSP_ROUTES]) {
    if (!route.startsWith("/") || seen.has(route)) continue;
    seen.add(route);
    routes.push(route);
  }
  return routes;
}

/**
 * A redirect to Vercel's login is not an off-site link. Deployment URLs
 * (`*.vercel.app`) sit behind Deployment Protection and answer 302 to
 * `vercel.com`; treating that as "nothing to check" would pass the run
 * without seeing a single page. Any other redirect stays skipped — that
 * document isn't ours.
 */
export function isDeploymentAuthWall(location: string): boolean {
  try {
    return new URL(location).hostname === "vercel.com";
  } catch {
    return false;
  }
}
