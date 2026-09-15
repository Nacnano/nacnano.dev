/**
 * Guard the `globalEnv` contract that `eslint-config-turbo` used to enforce.
 *
 * Turbo's build cache and Vercel's runtime only forward env vars that are
 * declared in `turbo.json`'s `globalEnv`. Read one that is not listed and it
 * is `undefined` in a cached build — a silent misconfiguration, not a crash.
 * PR #45 removed `eslint-config-turbo` (which had a `no-undeclared-env-vars`
 * rule) and neither Biome nor oxlint replaces it, so this script does.
 *
 * The check: every `process.env.NAME` read anywhere in the client must appear
 * in `globalEnv`. Reads are collected from production code only — the test
 * files set arbitrary vars for mocking and are not the contract. A var in
 * `globalEnv` that nothing reads is fine (turbo/CI consume some of them, e.g.
 * `CI` and `VERCEL_GIT_COMMIT_SHA`), so this is deliberately one-directional.
 *
 * Coverage is `apps/client`'s top-level config files (`next.config.js`,
 * `playwright.config.ts`) plus everything under `src` — the two config files
 * are where an env read is most likely to be added and were the gap a
 * `src/**`-only glob would miss. `node_modules` and `.next` are never scanned.
 *
 * Reads are found by walking the parsed AST, not by regex over the raw text.
 * A regex needs to first strip comments, and stripping `//` with a regex also
 * eats the `//` inside every URL string (`"https://…"`), which silently hides
 * any real read that shares the line — a guard that passes is worse than no
 * guard. Parsing sidesteps the whole class: string literals and comments are
 * simply not `process.env` member accesses, so they are never mistaken for
 * reads, and both the dotted (`process.env.FOO`) and bracket
 * (`process.env["FOO"]`) forms are matched exactly.
 *
 * Wired into the client `lint` task, so `bun run lint` (and therefore CI) fails
 * on an undeclared read without needing a linter plugin.
 */
import { readFileSync } from "node:fs";
import { Glob } from "bun";
import ts from "typescript";

// From apps/client/src/scripts, up four levels is the repo root.
const ROOT = new URL("../../../../", import.meta.url).pathname;
const CLIENT = `${ROOT}apps/client`;
const TURBO_MANIFEST = `${ROOT}turbo.json`;

// Top-level config (next.config.js, playwright.config.ts) and the source tree,
// scanned as two disjoint globs so node_modules/.next are never descended.
const PATTERN = "*.{ts,tsx,js,mjs}";
const SOURCES = [
  ...new Glob(PATTERN).scanSync({ cwd: CLIENT }),
  ...new Glob(`src/**/${PATTERN}`).scanSync({ cwd: CLIENT }),
];

const globalEnv: unknown = JSON.parse(readFileSync(TURBO_MANIFEST, "utf8")).globalEnv;
if (!Array.isArray(globalEnv)) {
  console.error(`turbo.json: "globalEnv" is missing or not an array (${TURBO_MANIFEST})`);
  process.exit(1);
}
const declared = new Set(globalEnv.filter((v): v is string => typeof v === "string"));

const used = new Map<string, string>();
function add(name: string, path: string) {
  if (!used.has(name)) used.set(name, path);
}

// Matches the `process.env` object itself: a member access `.env` on the
// identifier `process`. Reads are keyed off this so both `process.env.X` and
// `process.env["X"]` are caught and the dynamic `process.env[key]` form
// (unguessable, unused here) is not.
function isProcessEnv(node: ts.Node): boolean {
  return (
    ts.isPropertyAccessExpression(node) &&
    node.name.text === "env" &&
    ts.isIdentifier(node.expression) &&
    node.expression.text === "process"
  );
}

function scriptKind(path: string): ts.ScriptKind {
  if (path.endsWith(".tsx")) return ts.ScriptKind.TSX;
  if (path.endsWith(".js") || path.endsWith(".mjs")) return ts.ScriptKind.JS;
  return ts.ScriptKind.TS;
}

function collect(path: string) {
  const code = readFileSync(`${CLIENT}/${path}`, "utf8");
  const sourceFile = ts.createSourceFile(
    path,
    code,
    ts.ScriptTarget.Latest,
    /* setParentNodes */ true,
    scriptKind(path)
  );
  const visit = (node: ts.Node) => {
    if (
      ts.isPropertyAccessExpression(node) &&
      isProcessEnv(node.expression) &&
      ts.isIdentifier(node.name)
    ) {
      add(node.name.text, path);
    }
    if (
      ts.isElementAccessExpression(node) &&
      isProcessEnv(node.expression) &&
      node.argumentExpression &&
      ts.isStringLiteral(node.argumentExpression)
    ) {
      add(node.argumentExpression.text, path);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
}

for (const path of SOURCES) {
  if (path.includes(".test.")) continue;
  collect(path);
}

const missing = [...used.keys()].filter((name) => !declared.has(name));
if (missing.length > 0) {
  console.error(
    "process.env reads missing from turbo.json globalEnv (add each, or stop reading it):"
  );
  for (const name of missing) {
    console.error(`  process.env.${name}  (first read in apps/client/${used.get(name)})`);
  }
  process.exit(1);
}

console.log(
  `env-guard: ${used.size} process.env reads, all declared in turbo.json globalEnv`
);
