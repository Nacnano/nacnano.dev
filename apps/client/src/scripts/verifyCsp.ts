/**
 * Fetches every page from a running production server and proves that the
 * Content-Security-Policy it sent would let each of that page's inline scripts
 * run — the assertion that a browser makes, without needing a browser.
 *
 *   bun run build && bun run start &
 *   bun run verify:csp
 *
 * This is the regression guard for the `'unsafe-inline'` removal: if the hash
 * manifest drifts, or Next stops stamping the nonce onto its bootstrap scripts
 * on a dynamic route, the page it breaks is named here instead of in a console
 * a visitor sees.
 */
import { readdirSync } from "node:fs";
import path from "node:path";

import { extractInlineScriptTags, hashInlineScript } from "../lib/cspHashes";

const BASE_URL = process.env.VERIFY_CSP_URL ?? "http://localhost:3000";

// Every page the build prerendered, so a new route is covered the day it is
// added, plus the routes that are only rendered on demand.
const PAGES = [...prerenderedRoutes(), "/activity", "/this-page-does-not-exist"];

const NONCE = /(^|\s)nonce="([^"]*)"/;

function prerenderedRoutes(): string[] {
  const root = path.join(import.meta.dir, "../../.next/server/app");
  const walk = (dir: string, prefix: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      if (entry.isDirectory())
        return walk(path.join(dir, entry.name), `${prefix}${entry.name}/`);
      if (!entry.name.endsWith(".html")) return [];
      // `_not-found` and `_global-error` are reached by requesting something
      // that does not exist, which the list below already does.
      if (entry.name.startsWith("_")) return [];
      const name = entry.name.slice(0, -".html".length);
      return [name === "index" ? "/" : `${prefix}${name}`];
    });
  return walk(root, "/");
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
  // Manual redirects: `/link/*` sends visitors off-site, and an off-site
  // document is not ours to police.
  const response = await fetch(new URL(pathname, BASE_URL), {
    headers: { accept: "text/html" },
    redirect: "manual",
  });
  if (response.status >= 300 && response.status < 400) return [];

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

const problems = (await Promise.all(PAGES.map(checkPage))).flat();

if (problems.length > 0) {
  for (const problem of problems) console.error(`✗ ${problem}`);
  process.exit(1);
}
console.log(
  `✓ ${PAGES.length} pages: every inline script is allowed by the CSP it was served with.`
);
