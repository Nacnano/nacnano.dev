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
