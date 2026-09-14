const next = require("eslint-config-next");
const turboModule = require("eslint-config-turbo/flat");
const prettier = require("eslint-config-prettier");

// The flat entry ships as an ES default export; unwrap it for CJS `require`.
const turbo = turboModule.default ?? turboModule;

/**
 * Shared flat ESLint config (ESLint 9+, the format Next 16 ships).
 *
 * `eslint-config-next` default-exports a native `Linter.Config[]`, so the old
 * FlatCompat/`.eslintrc` chain is gone. Order matters: `turbo` adds
 * `turbo/no-undeclared-env-vars` (the guard that catches a `process.env.X` read
 * missing from `turbo.json`'s `globalEnv`), then `next` for core-web-vitals +
 * typescript-eslint, then prettier's rule-off map so stylistic rules don't fight
 * `bun run format`. Formatting itself stays with Prettier, not ESLint.
 *
 * This package is CommonJS and `require`s packages that ship ESM. That works on
 * Node 22 via `require(esm)` — the version CI pins (`ci.yml: setup-node 22`).
 * If we ever drop below Node 22, convert this package to ESM.
 *
 * The Next plugin infers the app root from the ESLint working directory; every
 * lint run here has `cwd = apps/client` (see the app's `lint` script), so
 * page-directory detection lands correctly. A second app in this workspace would
 * need Next's `settings.next.rootDir` set explicitly.
 */
module.exports = [
  {
    // `eslint .` covers config files too; keep generated/vendored paths out.
    ignores: [
      ".next/**",
      "out/**",
      "build/**",
      "coverage/**",
      "node_modules/**",
      "**/*.d.ts",
      "public/**",
    ],
  },
  ...turbo,
  ...next,
  {
    rules: {
      ...prettier.rules,
      // App Router with a custom <Link> — the page-root detection misfires here.
      "@next/next/no-html-link-for-pages": "off",
    },
  },
];