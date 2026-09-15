/**
 * Guard the `globalEnv` contract that `eslint-config-turbo` used to enforce.
 *
 * Turbo's build cache and Vercel's runtime only forward env vars that are
 * declared in `turbo.json`'s `globalEnv`. Read one that is not listed and it
 * is `undefined` in a cached build — a silent misconfiguration, not a crash.
 * PR #45 removed `eslint-config-turbo` (which had a `no-undeclared-env-vars`
 * rule) and neither Biome nor oxlint replaces it, so this script does.
 *
 * The check: every `process.env.NAME` read anywhere in the client source must
 * appear in `globalEnv`. Reads are collected from production code only — the
 * test files set arbitrary vars for mocking and are not the contract. A var in
 * `globalEnv` that nothing reads is fine (turbo/CI consume some of them, e.g.
 * `CI` and `VERCEL_GIT_COMMIT_SHA`), so this is deliberately one-directional.
 *
 * Wired into the client `lint` task, so `bun run lint` (and therefore CI) fails
 * on an undeclared read without needing a linter plugin.
 */
import { readFileSync } from "node:fs";
import { Glob } from "bun";

// From apps/client/src/scripts, up four levels is the repo root.
const ROOT = new URL("../../../../", import.meta.url).pathname;
const CLIENT_SRC = `${ROOT}apps/client/src`;
const TURBO_MANIFEST = `${ROOT}turbo.json`;

// Matches `process.env.FOO` and `process.env["FOO"]`; ignores the dynamic
// `process.env[key]` form, which nothing here uses and which is unguessable.
const READ =
  /process\.env(?:\.([A-Za-z_][A-Za-z0-9_]*)|\[\s*["']([A-Za-z_][A-Za-z0-9_]*)["']\s*\])/g;

const globalEnv: unknown = JSON.parse(readFileSync(TURBO_MANIFEST, "utf8")).globalEnv;
if (!Array.isArray(globalEnv)) {
  console.error(`turbo.json: "globalEnv" is missing or not an array (${TURBO_MANIFEST})`);
  process.exit(1);
}
const declared = new Set(globalEnv.filter((v): v is string => typeof v === "string"));

const used = new Map<string, string>();
for (const path of new Glob("**/*.{ts,tsx}").scanSync({ cwd: CLIENT_SRC })) {
  if (path.includes(".test.")) continue;
  const raw = readFileSync(`${CLIENT_SRC}/${path}`, "utf8");
  // Strip comments first, so prose examples like `process.env.FOO` in a doc
  // block or the regex's own source above are not mistaken for real reads.
  const text = raw.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  for (const match of text.matchAll(READ)) {
    const name = match[1] ?? match[2];
    if (name && !used.has(name)) used.set(name, path);
  }
}

const missing = [...used.keys()].filter((name) => !declared.has(name));
if (missing.length > 0) {
  console.error(
    "process.env reads missing from turbo.json globalEnv (add each, or stop reading it):"
  );
  for (const name of missing) {
    console.error(
      `  process.env.${name}  (first read in apps/client/src/${used.get(name)})`
    );
  }
  process.exit(1);
}

console.log(
  `env-guard: ${used.size} process.env reads, all declared in turbo.json globalEnv`
);
