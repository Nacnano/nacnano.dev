# Contributing

This is a personal site, but the engineering bar is production-grade and the
checks below are enforced on every pull request. The canonical setup and command
reference is the [root `README.md`](README.md); this file adds the expectations
around changes.

## Before you open a pull request

From the repo root, all of these must pass (they are the CI gates):

```bash
bun install --frozen-lockfile
bun run format:check   # Prettier owns formatting
bun run typecheck      # tsc --noEmit, strict + noUncheckedIndexedAccess
bun run lint           # oxlint + biome + env-var guard + runtime-version guard
bun run test           # bun test (unit + route-level), per-file coverage floor
bun audit --audit-level=high
bun run build          # next build + CSP hash two-pass + RSS/sitemap postbuild
```

Then, from `apps/client`, against the built server:

```bash
bun run verify:csp     # served CSP vs emitted inline scripts
bun run e2e            # Playwright, against a production `next start`
```

Every change ships with its tests and docs. Keep a PR to one concern; no
drive-by refactors.

## What the guards actually enforce

These are not decoration — know them so a red build is obvious to fix:

- **Runtime-version guard** (`checkRuntimeVersions.ts`): `.nvmrc`, root and
  client `engines.node`, `@types/node`, and CI `node-version`/`bun-version` must
  describe one runtime. Bump Node by editing `.nvmrc` and all the places it
  pins, or the build fails.
- **Env-var guard** (`checkEnvVars.ts`): every `process.env.NAME` read in
  production code must be listed in `turbo.json` `globalEnv`, or it would be
  silently `undefined` in a cached build.
- **Static-asset guard** (`checkStaticAssets.ts`): manifest icon sources must
  exist, PNG dimensions must match what they claim, and the favicon payload must
  stay within budget.
- **Content-graph guard** (`validateContentGraph`, run in `postbuild`): a
  typo'd author slug, layout, date, duplicate slug, or a missing local image /
  author avatar fails the build naming the file. Author `twitter`/`linkedin`/
  `github` must each be an absolute `http(s)` URL, not a bare handle.
- **Coverage floor**: each covered lib file must stay at ≥ 60% (bun enforces it
  silently — trust the exit code, not the printed table).

## Content authoring

Essays and author bios are MDX under `apps/client/src/data/`. Frontmatter is
validated at build time (see the content-graph guard above): published posts
need a non-empty `title`, a valid `date`, and a `summary`; `draft: true` hides a
post (and exempts it from the published-only gates). Keep `timelineData.ts` in
sync with <https://resume.nacnano.dev>.

## Environment files

`.env.local` is gitignored and never committed. Do not commit real credentials.
Use `apps/client/.env.example` as the template; it documents which variables are
required together and how to generate the IP salt. A production Redis token
belongs only in your deployment provider's secrets store.

## Conductor

Shared workspace scripts live in `.conductor/settings.toml`. It starts with
`run_mode = "nonconcurrent"` because parallel local workspaces would otherwise
share one Upstash store. `UPSTASH_KEY_PREFIX` (documented in
`apps/client/.env.example`) is what isolates them: give each workspace its own
prefix before switching to concurrent runs, or leave the workspaces in static
mode with no Upstash credentials at all.
