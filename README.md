# nacnano.dev

Personal site and essay archive for Chotpisit Adunsehawat (Nacnano).

[![CI](https://github.com/Nacnano/nacnano.dev/actions/workflows/ci.yml/badge.svg)](https://github.com/Nacnano/nacnano.dev/actions/workflows/ci.yml)

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · Tailwind CSS ·
MDX via next-mdx-remote, in a Bun workspace driven by Turborepo.

## Layout

```
apps/client                 the site
  src/app                   routes (App Router)
  src/components            shared UI
  src/layouts               page-level compositions
  src/lib                   pure helpers, unit tested
  src/data                  content: essays, projects, timeline, site metadata
  src/scripts               postbuild (RSS)
packages/tsconfig           shared TypeScript config
packages/eslint-config-custom  shared ESLint config
```

## Getting started

Bun is required — `curl -fsSL https://bun.sh/install | bash`.

```bash
bun install
bun run dev          # all workspaces via turbo
```

The site runs at <http://localhost:3000>. To serve a production build
(`next build` first), use `bun run start`; `bun run serve` is a back-compat
alias that does the same thing — kept because tooling and muscle memory invoke
`serve`, not a second way to run the server.

> **Keep `bun.lock` at `lockfileVersion: 1`.** Vercel's build image ships Bun
> 1.3.x, which cannot parse the `lockfileVersion: 2` file Bun >= 1.4 writes —
> it fails to read it, silently resolves everything fresh, and the deploy stops
> being reproducible. Both 1.3.x and 1.4.x read a v1 lockfile and neither
> rewrites it, so regenerate with `bunx bun@1.3.14 install` if it ever needs
> rebuilding from scratch.

## Checks

These four run in CI on every pull request, and are the same commands locally:

```bash
bun run typecheck    # tsc --noEmit, strict
bun run lint         # eslint, warnings fail (use lint:fix to write)
bun run test         # bun test
bun run build        # next build + RSS postbuild
```

## Editing content

| What                  | Where                                      |
| --------------------- | ------------------------------------------ |
| Essays                | `apps/client/src/data/blogs/*.mdx`         |
| Projects              | `apps/client/src/data/projectsData.ts`     |
| Work and education    | `apps/client/src/data/timelineData.ts`     |
| Name, status, socials | `apps/client/src/data/siteMetadata.ts`     |
| Author bio            | `apps/client/src/data/authors/default.mdx` |
| Answered questions    | `apps/client/src/data/amaData.ts`          |

Essay frontmatter needs `title`, `date` and `summary`; set `draft: true` to
hide one. Each essay closes on a single `#### ...` line, which renders as the
takeaway block rather than a heading.

The `/ama` answers are authored content. The ask box writes to a private Redis
inbox that no page and no route reads back. Read it with `bun run ama:inbox`
from `apps/client`, then write the ones worth answering into `amaData.ts` by
hand. Answers are MDX, and `draft: true` hides one without deleting it.
Submissions expire from the inbox after 90 days, and the box is inert unless
`UPSTASH_REDIS_REST_*` is configured. To be told when a question arrives rather
than having to check, set `AMA_NOTIFY_URL` to a Slack or Discord webhook (or
any JSON endpoint), or `DISCORD_BOT_TOKEN` plus `DISCORD_CHANNEL_ID` /
`DISCORD_DM_USER_ID` to have a bot post or DM it. Either, both, or neither.

`timelineData.ts` must stay in sync with <https://resume.nacnano.dev>, which is
the source of truth for roles and dates.

## Design

`PRODUCT.md` records product truth and `DESIGN.md` the built visual system.
Both live in `apps/client/`.

## Licence

Code is MIT. The essays and photographs are not — see [LICENSE](LICENSE).
