# apps/client

The Next.js site. **The [repo root `README.md`](../../README.md) is the canonical
documentation** — setup, scripts, checks, content authoring, and the design docs
live there.

This file exists only so tools landing in this directory are pointed at the right
place. Concretely:

- **Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 ·
  MDX via `next-mdx-remote`, in a Bun workspace driven by Turborepo. (This file
  previously claimed Next 14 and Contentlayer; both are long gone — Contentlayer
  was replaced by the loader in `src/lib/content.ts`.)
- **Common commands** (run from the repo root unless noted):

  ```bash
  bun run dev          # next dev
  bun run build        # next build + CSP hash two-pass + RSS/sitemap postbuild
  bun run test         # bun test (unit + route-level)
  bun run lint         # oxlint + biome + env-var guard + runtime-version guard
  bun run verify:csp   # check the served CSP against emitted markup
  bun run e2e          # Playwright, against a production `next start`
  ```

See the root README for the full, authoritative list.
