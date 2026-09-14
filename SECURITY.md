# Security

## Reporting a vulnerability

Email **chotpisit.adu@gmail.com** with the details and, if you can, a way to
reproduce it. Please do not open a public issue for anything exploitable.

I maintain this in my own time, so expect a reply in days rather than hours.

## Scope

This repository builds a personal website that is **mostly** static, with one
live, dynamic feature: the `/activity` visit feed. That feature is a small
backend — two Next.js route handlers (`POST /api/activity/visit`,
`GET /api/activity/feed`) backed by an Upstash Redis instance — so it does store
data: anonymised, roughly-geo-tagged page-view events (a coarse country code, an
optional city, and coordinates rounded to ~10 km, with a salted hash of the IP
used only as a rate-limit key). There is no authentication and no account or
personally-identifiable data.

Everything outside that feed is prerendered at build time, so the realistic
surface is the dependency tree, the build pipeline, and the two activity
endpoints.

For anything exploitable in the activity feed — abuse of the write beacon, the
read path, the rate limiter, or anything that could read or write the store
beyond normal traffic — please email me directly (above) rather than opening a
public issue.

## Content-Security-Policy

`script-src` does not allow `'unsafe-inline'`. Because the site is part
prerendered and part server-rendered, its inline scripts are allowed two ways
at once, in one header built by `apps/client/src/lib/csp.ts` and sent by
`apps/client/src/proxy.ts`:

- **A per-request nonce**, which Next stamps onto the bootstrap scripts it
  emits while server-rendering — `/activity`, an un-prerendered `/link/[link]`,
  and dev.
- **`sha256` hashes** of the inline scripts in the prerendered HTML. A nonce
  can never appear in a page that was built once and served from cache, so
  those are pinned at build time instead, in
  `apps/client/src/generated/cspScriptHashes.ts`.

That manifest is generated but committed, because the proxy that reads it is
bundled during the build. So the build runs twice — once to produce the HTML,
once to bundle the proxy with the resulting hashes — then checks that the two
passes agree. It is also why `generateBuildId` is pinned to the commit: a
random build ID is embedded in every page's payload and would make the hashes
unreproducible.

`style-src` still allows `'unsafe-inline'`: Tailwind's runtime theme switch and
`next/font` write `style` attributes, which no nonce or hash can reach.

`e2e/csp.e2e.ts` is the guard. A stale manifest and a Next release that stops
applying the nonce fail the same silent way — the policy looks right, the
browser refuses the scripts, the page never hydrates — so that spec watches for
real `securitypolicyviolation` events and then asserts the page hydrated.

## Automation

Dependency updates are automated through Dependabot, and CI runs typecheck,
lint, tests, a production build and the Playwright suite on every pull
request.
