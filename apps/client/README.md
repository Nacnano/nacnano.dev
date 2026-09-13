# nacnano.dev

Personal site and essay archive for Chotpisit Adunsehawat.

Next.js 14 (App Router) · TypeScript · Tailwind CSS · Contentlayer + MDX.
Bun workspaces + Turborepo.

## Develop

```bash
bun install
bun run dev       # from the repo root, or `bun run dev` in apps/client
```

Bun is required: `curl -fsSL https://bun.sh/install | bash`

> **Keep `bun.lock` at `lockfileVersion: 1`.** Vercel's build image ships Bun
> 1.3.x, which cannot parse the `lockfileVersion: 2` file that Bun >= 1.4
> writes — it fails to read it, silently resolves everything fresh, and the
> deploy stops being reproducible. Both 1.3.x and 1.4.x read a v1 lockfile and
> neither rewrites it, so regenerate with `bunx bun@1.3.14 install` (or any
> 1.3.x) if the lockfile ever needs rebuilding from scratch.

## Build

```bash
bun run build     # next build + RSS/sitemap postbuild
```

## Content

- Essays: `src/data/blogs/*.mdx`. Frontmatter needs `title`, `date` and `summary`; set `draft: true` to hide one.
  Each essay closes on a single `#### ...` line, which renders as the takeaway block.
- Projects: `src/data/projectsData.ts`
- Work and education: `src/data/timelineData.ts` — **keep this in sync with
  <https://resume.nacnano.dev>, which is the canonical CV.**
- Site-wide facts, including the status line shown on the home page: `src/data/siteMetadata.js`

## Design

See `PRODUCT.md` for product truth and `DESIGN.md` for the visual system.
