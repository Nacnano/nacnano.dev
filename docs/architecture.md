# Architecture

How `apps/client` is put together, and the rules that keep it that way. This is
the map; the [root `README.md`](../README.md) is the runbook, and
[`CONTRIBUTING.md`](../CONTRIBUTING.md) is the contribution bar.

## Layout and dependency direction

```
app/            route handlers + pages (Next App Router) — the outermost layer
  api/            per-request route handlers, thin
components/     client React ("use client")
layouts/        page compositions
lib/            pure helpers + server-only adapters — no layer above depends
                downward on `app/`
data/           content + site metadata (typed)
scripts/        build/CI-time tools (RSS, CSP hashes, guards)
```

The dependency arrow points **inward**: `app/` → `components/`/`lib/`, never the
reverse. `lib/` never imports from `app/`. Within `lib/`, the modules split into
two kinds, and the boundary between them is the most important rule here.

## The client/server boundary

A single set of pure modules is shared by the browser and the server; server-only
code must never leak across.

- **Client-safe (no Node, no Redis, no secrets):** `activityTypes.ts` (types +
  the canonical schema parsers), `activity.ts` (pure aggregators, `isInternalPath`,
  `isActivityLive`). These run during the build, in the browser, and under tests.
  A page computes a plain boolean (e.g. `live`) and hands it to the client as a
  **prop** — the client never reads a server env var.
- **Server-only:** `activityRedis.ts` (the only Upstash client), `rateLimit.ts`,
  `runtimeConfig.ts`, `ama*.ts`, `discord.ts`, `content.ts` (reads MDX off disk),
  `observability.ts` (the endpoint is deliberately **not** `NEXT_PUBLIC_`-prefixed
  so it stays out of the bundle). `runtimeConfig` also has an explicit
  `typeof window` guard as a second line of defence.

`isActivityLive()` is the client-safe bridge: truthy when _either_ credential is
set, so a half-configured deployment reads as "intends live" and then fails
loudly at `getActivityClient()` rather than silently degrading to static.

## Two operating modes

- **Static mode** — no `UPSTASH_REDIS_REST_*` set. The visit beacon no-ops, the
  feed shows the local seed in dev and an honest empty state on Vercel, and the
  `/ama` box reports it is unreachable rather than faking success. A genuinely
  static, dependency-free deploy.
- **Live mode** — both credentials + a strong `VISIT_IP_SALT` configured. Visits
  append to a capped Redis **stream** (`activity:stream`, `MAXLEN` + a `MINID`
  age trim + an idle `EXPIRE`) with a running counter; the public feed reads the
  newest page and pages older ones by stream id (the cursor). Rate limiting keys
  each bucket by a **salted SHA-256 of the IP** — the raw address never reaches
  Redis. `UPSTASH_KEY_PREFIX` namespaces every key for test/workspace isolation.

## The API surface

- `POST /api/activity/visit` — unauthenticated beacon. Bounded, validated
  (`isInternalPath`), rate-limited; the page title is resolved server-side from
  our own content, never taken from the client.
- `GET /api/activity/feed` — newest-first page, short edge cache (`s-maxage=2`)
  to absorb the per-tab poll storm; a store failure is a 5xx (never a cached
  empty feed), so the client keeps its last-known-good page.
- `/ama` action + inbox — submissions land in a private expiring stream; the
  public page reads authored answers only, never the raw inbox.
- `GET /api/cron/daily-report` — Vercel Cron's daily summary of the last 24
  hours, posted as the Discord bot (`lib/activityReport.ts`). Requires
  `Authorization: Bearer $CRON_SECRET`; the endpoint is closed, not open, when
  the secret is unset. `bun run activity:report` posts the same report from
  the terminal.

## Build pipeline

`bun run build` is deliberately a **two-pass** run:

1. `next build` prerenders the pages.
2. `cspScriptHashes.ts` hashes every inline `<script>` the build emitted.
3. `next build` again, so the served CSP carries the hashes of the scripts it
   actually serves.
4. `cspScriptHashes.ts --check` fails if the manifest and the served markup
   disagree, then `postbuild.ts` runs the content-graph guard and writes the RSS
   feeds.

CSP is enforced two ways: this hash-manifest check (served policy vs served
markup) and the Playwright `securitypolicyviolation` suite (real browser
refusals). They catch different drift, which is why both exist.

## Content pipeline

`lib/content.ts` replaces Contentlayer with an on-disk MDX loader (`gray-matter`

- `next-mdx-remote`). Frontmatter is validated strictly at build time, and
  `validateContentGraph` enforces cross-file integrity (author references, slug
  uniqueness and grammar, asset existence) — see `CONTRIBUTING.md`.
