/**
 * Fetches every page from a running server and proves that the
 * Content-Security-Policy it sent would let each of that page's inline scripts
 * run — the assertion that a browser makes, without needing a browser.
 *
 *   bun run build && bun run start &
 *   bun run verify:csp
 *
 * `VERIFY_CSP_URL` points the fetch somewhere other than localhost. CI sets it
 * to https://www.nacnano.dev after a production deploy. With a local build the
 * page list comes from `.next/server/app`; without one (the post-deploy job
 * does not build) it comes from that server's `/sitemap.xml`.
 *
 * This is the regression guard for the `'unsafe-inline'` removal: if the hash
 * manifest drifts, or Next stops stamping the nonce onto its bootstrap scripts
 * on a dynamic route, the page it breaks is named here instead of in a console
 * a visitor sees.
 */
import { readdirSync } from "node:fs";
import path from "node:path";

import { extractInlineScriptTags, hashInlineScript } from "../lib/cspHashes";
import { isDeploymentAuthWall, routesFromSitemap, routesToCheck } from "../lib/cspPages";

const BASE_URL = process.env.VERIFY_CSP_URL ?? "http://localhost:3000";

const NONCE = /(^|\s)nonce="([^"]*)"/;

/** Prerendered routes from a local build, or null when there is no build. */
function localPrerenderedRoutes(): string[] | null {
  const root = path.join(import.meta.dir, "../../.next/server/app");
  const walk = (dir: string, prefix: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      if (entry.isDirectory())
        return walk(path.join(dir, entry.name), `${prefix}${entry.name}/`);
      if (!entry.name.endsWith(".html")) return [];
      // `_not-found` and `_global-error` are reached by requesting something
      // that does not exist, which `routesToCheck` already adds.
      if (entry.name.startsWith("_")) return [];
      const name = entry.name.slice(0, -".html".length);
      return [name === "index" ? "/" : `${prefix}${name}`];
    });
  try {
    return walk(root, "/");
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return null;
    throw error;
  }
}

async function discoverRoutes(): Promise<string[]> {
  const local = localPrerenderedRoutes();
  if (local) return routesToCheck(local);

  // No build on disk: ask the server being checked what it publishes. This is
  // the post-deploy path. A sitemap that isn't ours (a login wall, an error
  // page) must fail the run, not check zero pages and pass.
  const sitemapUrl = new URL("/sitemap.xml", BASE_URL);
  const response = await fetch(sitemapUrl, {
    headers: { accept: "application/xml,text/xml" },
    redirect: "manual",
  });
  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get("location") ?? "";
    throw new Error(
      `Sitemap redirected (${response.status} → ${location || "nowhere"}). ` +
        `${BASE_URL} is not serving pages to this check.`
    );
  }
  if (!response.ok) {
    throw new Error(`Could not read ${sitemapUrl} (${response.status}).`);
  }
  const routes = routesFromSitemap(await response.text(), BASE_URL);
  if (routes.length === 0) {
    throw new Error(`${sitemapUrl} listed no pages.`);
  }
  return routesToCheck(routes);
}

function scriptSrc(policy: string): string[] {
  const directive = policy
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("script-src "));
  if (!directive) throw new Error(`No script-src in policy: ${policy}`);
  return directive.split(/\s+/).slice(1);
}

async function checkPage(pathname: string): Promise<string[]> {
  // A redirect leaves this origin. The document it lands on is not ours to
  // police. A redirect to Vercel's login is the opposite — the page exists
  // and we were refused it.
  const response = await fetch(new URL(pathname, BASE_URL), {
    headers: { accept: "text/html" },
    redirect: "manual",
  });
  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get("location") ?? "";
    if (isDeploymentAuthWall(location)) {
      return [`${pathname}: deployment is behind Vercel authentication`];
    }
    return [];
  }
  if (response.status === 404 && pathname !== "/this-page-does-not-exist") {
    return [`${pathname}: expected a document, got 404`];
  }
  if (response.status >= 400 && pathname !== "/this-page-does-not-exist") {
    return [`${pathname}: HTTP ${response.status}`];
  }

  const policy = response.headers.get("content-security-policy");
  if (!policy) return [`${pathname}: no Content-Security-Policy header`];

  const sources = scriptSrc(policy);
  const problems: string[] = [];
  if (sources.includes("'unsafe-inline'")) {
    problems.push(`${pathname}: script-src still allows 'unsafe-inline'`);
  }
  if (!sources.some((source) => source.startsWith("'nonce-"))) {
    problems.push(`${pathname}: script-src carries no nonce`);
  }

  const html = await response.text();
  for (const { attributes, body } of extractInlineScriptTags(html)) {
    const nonce = NONCE.exec(attributes)?.[2];
    if (nonce && sources.includes(`'nonce-${nonce}'`)) continue;
    if (sources.includes(hashInlineScript(body))) continue;
    problems.push(
      `${pathname}: inline script blocked (no matching nonce or hash): ${JSON.stringify(
        body.slice(0, 80)
      )}…`
    );
  }
  return problems;
}

const pages = await discoverRoutes();
const problems = (await Promise.all(pages.map(checkPage))).flat();

if (problems.length > 0) {
  for (const problem of problems) console.error(`✗ ${problem}`);
  process.exit(1);
}
console.log(
  `✓ ${pages.length} pages: every inline script is allowed by the CSP it was served with.`
);
