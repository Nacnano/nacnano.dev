/**
 * Guard the runtime contract the repo commits to.
 *
 * A dozen files describe "the" runtime: the root `package.json` `engines.node`
 * and `packageManager`, `apps/client/package.json`, `.nvmrc`, and the CI
 * workflow's `node-version` / `bun-version`. They drift silently — last month
 * `@types/node` was pinned to the Node 26 line while production (and `.nvmrc`
 * and CI) said 22, so the compiler was checking against a Node that never
 * ships. This script turns that drift into a red build.
 *
 * It checks, against the single Node major in `.nvmrc`:
 *   - root and client `engines.node` agree with it,
 *   - `@types/node` is the same major (types must match the runtime),
 *   - CI `node-version` is the same major, across EVERY job that pins it
 *     (`verify` and `e2e`) — a value that differs between jobs is itself drift,
 *   - CI `bun-version` matches the root `packageManager` bun version, likewise
 *     across every job,
 *   - the lockfile is still `lockfileVersion` 1 (Vercel's Bun 1.3.x cannot read
 *     a v2 lockfile — see the root README).
 *
 * Wired into the client `lint` task so `bun run lint` (and CI) enforce it. The
 * core is pure over an injected file reader so every branch is unit-testable
 * without touching disk.
 */
import { readFileSync } from "node:fs";

export type ReleaseVersions = {
  nvmrc: string;
  rootPackageJson: string;
  clientPackageJson: string;
  ciWorkflow: string;
  bunLock: string;
};

export type VersionMismatch = { check: string; expected: string; actual: string };

function majorOf(version: string): string {
  const match = /(\d+)/.exec(version.trim());
  return match ? (match[1] ?? "") : "";
}

type PackageManifest = {
  engines?: Record<string, unknown>;
  devDependencies?: Record<string, unknown>;
  packageManager?: unknown;
};

function readJson(raw: string): PackageManifest {
  return JSON.parse(raw) as PackageManifest;
}

/** Extract the pinned `bun` version from a `packageManager` field like `bun@1.3.14`. */
export function bunFromPackageManager(packageManager: unknown): string {
  if (typeof packageManager !== "string") return "";
  const match = /^bun@(\d+\.\d+\.\d+)/.exec(packageManager.trim());
  return match ? (match[1] ?? "") : "";
}

/** Every `key: value` scalar a workflow declares for `key`, in file order. */
export function yamlValues(source: string, key: string): string[] {
  const pattern = new RegExp(`^\\s*${key}:\\s*["']?([^"'\\n#]+)["']?\\s*$`, "gm");
  return [...source.matchAll(pattern)].map((m) => (m[1] ?? "").trim());
}

/**
 * The single value a workflow commits to for `key`, or "" when it declares none.
 *
 * `ci.yml` pins node/bun in BOTH the `verify` and `e2e` jobs, and reading only
 * the first occurrence meant the second could drift off the runtime unnoticed —
 * an e2e job on a Node the site never ships. Two different values for one key is
 * itself drift, so it returns a marker that can never match the expected value
 * and names what it found.
 */
function yamlValue(source: string, key: string): string {
  const unique = [...new Set(yamlValues(source, key))];
  if (unique.length === 0) return "";
  return unique.length === 1 ? (unique[0] ?? "") : `inconsistent: ${unique.join(", ")}`;
}

export function checkRuntimeVersions(v: ReleaseVersions): VersionMismatch[] {
  const mismatches: VersionMismatch[] = [];
  const nodeMajor = majorOf(v.nvmrc);

  const root = readJson(v.rootPackageJson);
  const client = readJson(v.clientPackageJson);

  const add = (check: string, expected: string, actual: string) => {
    if (expected !== actual) mismatches.push({ check, expected, actual });
  };

  add(
    ".nvmrc vs root engines.node",
    nodeMajor,
    majorOf(String(root.engines?.node ?? ""))
  );
  add(
    ".nvmrc vs client engines.node",
    nodeMajor,
    majorOf(String(client.engines?.node ?? ""))
  );
  add(
    ".nvmrc vs @types/node",
    nodeMajor,
    majorOf(String(client.devDependencies?.["@types/node"] ?? ""))
  );

  // A workflow that declares two different values for one key is itself drift.
  // Compare the RAW value for that marker first — `majorOf` would regex out the
  // first digit run of "inconsistent: 22, 20" and hand back "22", hiding the
  // very mismatch this guard exists to catch.
  const ciNode = yamlValue(v.ciWorkflow, "node-version");
  add(
    "CI node-version vs .nvmrc",
    nodeMajor,
    ciNode.startsWith("inconsistent") ? ciNode : majorOf(ciNode)
  );
  const ciBun = yamlValue(v.ciWorkflow, "bun-version");
  add(
    "CI bun-version vs packageManager",
    bunFromPackageManager(root.packageManager),
    ciBun
  );

  // bun.lock is a JSONC-ish format (not strict JSON), so the one field we care
  // about is pulled with a regex rather than a fragile JSON.parse.
  const lockMatch = /"lockfileVersion"\s*:\s*(\d+)/.exec(v.bunLock);
  add("bun.lock lockfileVersion", "1", lockMatch ? (lockMatch[1] ?? "") : "");

  return mismatches;
}

function readFromRoot(root: string): ReleaseVersions {
  return {
    nvmrc: readFileSync(`${root}.nvmrc`, "utf8"),
    rootPackageJson: readFileSync(`${root}package.json`, "utf8"),
    clientPackageJson: readFileSync(`${root}apps/client/package.json`, "utf8"),
    ciWorkflow: readFileSync(`${root}.github/workflows/ci.yml`, "utf8"),
    bunLock: readFileSync(`${root}bun.lock`, "utf8"),
  };
}

function main(): void {
  // From apps/client/src/scripts, up four levels is the repo root.
  const root = new URL("../../../../", import.meta.url).pathname;
  const mismatches = checkRuntimeVersions(readFromRoot(root));
  if (mismatches.length > 0) {
    console.error(
      "runtime-version guard found drift (align every one with the pinned runtime):"
    );
    for (const m of mismatches) {
      console.error(`  - ${m.check}: expected ${m.expected}, got ${m.actual}`);
    }
    process.exit(1);
  }
  console.log("runtime-version guard: node/bun/types/CI/lockfile all agree");
}

if (import.meta.main) main();
