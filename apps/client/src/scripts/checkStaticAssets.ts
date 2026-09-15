/**
 * Guard the favicon / PWA-asset payload.
 *
 * The site shipped three identical 1928×1928, ~3.5 MB PNGs named `favicon-32x32`
 * / `apple-touch-icon` / `android-chrome-96x96`, and the manifest pointed at a
 * root-relative `/android-chrome-96x96.png` that never existed under
 * `public/`. A reader downloaded ten megabytes for a tab strip. The build had no
 * idea, because nothing compared the declared assets to the bytes on disk.
 *
 * This closes that gap as a build-time check: every icon the manifest references
 * must exist under `public`, its real PNG dimensions must match what the
 * manifest (and its own filename) claim, and the whole favicon payload must stay
 * inside a byte budget. Wired into the client `lint` task, so `bun run lint` —
 * and therefore CI — fails on the exact regression class that shipped.
 *
 * PNG dimensions are read straight from the IHDR chunk (width/height are the two
 * big-endian uint32s at byte offsets 16 and 20), so this needs no native image
 * tooling and runs identically on macOS and the Linux CI runner.
 */
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

// A favicon class is tiny by definition; anything larger is the 3.5 MB mistake
// wearing a different filename.
export const PER_FILE_BUDGET_BYTES = 100 * 1024;
export const TOTAL_FAVICON_BUDGET_BYTES = 500 * 1024;

/** The filesystem surface the checks need, so tests can inject an in-memory one. */
export type AssetProbe = {
  /** Read a file relative to the public root, or null when it does not exist. */
  read(relPath: string): Uint8Array | null;
  /** List files directly under a public-relative directory. */
  list(relDir: string): string[];
};

export type Dimensions = { width: number; height: number };

/** Parse width/height from a PNG's IHDR chunk; null if it is not a valid PNG. */
export function pngDimensions(bytes: Uint8Array | null): Dimensions | null {
  if (!bytes || bytes.length < 24) return null;
  for (let i = 0; i < PNG_SIGNATURE.length; i += 1) {
    if (bytes[i] !== PNG_SIGNATURE[i]) return null;
  }
  // IHDR is the first chunk: [len(4)] [type "IHDR"] at offset 8, so its data
  // begins at 16 and width/height are the first two big-endian uint32s.
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (
    view.getUint8(12) !== 0x49 || // I
    view.getUint8(13) !== 0x48 || // H
    view.getUint8(14) !== 0x44 || // D
    view.getUint8(15) !== 0x52 // R
  ) {
    return null;
  }
  return { width: view.getUint32(16, false), height: view.getUint32(20, false) };
}

/** Parse `192x192` into dimensions; null when the string is absent or malformed. */
export function parseDeclaredSizes(sizes: unknown): Dimensions | null {
  if (typeof sizes !== "string") return null;
  const match = /^(\d+)x(\d+)$/.exec(sizes.trim());
  if (!match) return null;
  return { width: Number(match[1]), height: Number(match[2]) };
}

/** Parse the `WxH` an asset filename claims (e.g. `favicon-32x32.png`), if any. */
export function parseFilenameSizes(file: string): Dimensions | null {
  const match = /(\d+)x(\d+)(?=[^/]*$)/.exec(file);
  if (!match) return null;
  return { width: Number(match[1]), height: Number(match[2]) };
}

function sameDims(a: Dimensions, b: Dimensions): boolean {
  return a.width === b.width && a.height === b.height;
}

/**
 * Validate the manifest's declared icons against the bytes on disk. Returns the
 * list of problems (empty when everything the manifest promises is real and
 * honestly sized).
 */
export function checkManifestIcons(
  manifest: unknown,
  probe: AssetProbe,
  faviconDir = "static/favicons"
): string[] {
  const problems: string[] = [];
  if (!manifest || typeof manifest !== "object") {
    return ["manifest is not a JSON object"];
  }
  const icons = (manifest as { icons?: unknown }).icons;
  if (!Array.isArray(icons)) return ["manifest has no `icons` array"];

  for (const icon of icons) {
    if (!icon || typeof icon !== "object") {
      problems.push("manifest icon entry is not an object");
      continue;
    }
    const { src, sizes, type } = icon as {
      src?: unknown;
      sizes?: unknown;
      type?: unknown;
    };
    if (typeof src !== "string" || !src.startsWith("/")) {
      problems.push(
        `manifest icon src must be an absolute /static/... path, got ${JSON.stringify(src)}`
      );
      continue;
    }
    const rel = src.replace(/^\/+/, "");
    const bytes = probe.read(rel);
    if (!bytes) {
      problems.push(`manifest references a missing file: /${rel}`);
      continue;
    }
    if (typeof type !== "string" || type.startsWith(" ")) {
      problems.push(`manifest icon ${rel} has an invalid MIME type`);
    }
    const actual = pngDimensions(bytes);
    if (!actual) {
      problems.push(`${rel} is not a readable PNG`);
      continue;
    }
    const declared = parseDeclaredSizes(sizes);
    if (declared && !sameDims(declared, actual)) {
      problems.push(
        `${rel} declares ${declared.width}x${declared.height} but its real PNG size is ${actual.width}x${actual.height}`
      );
    }
    const claimed = parseFilenameSizes(path.basename(rel));
    if (claimed && !sameDims(claimed, actual)) {
      problems.push(
        `${rel} is named for ${claimed.width}x${claimed.height} but its real PNG size is ${actual.width}x${actual.height}`
      );
    }
  }

  // The directory itself should carry the icons the manifest points at — a stale
  // duplicate that is no longer referenced is the same bytes-bloat mistake.
  for (const file of probe.list(faviconDir)) {
    if (!file.endsWith(".png")) continue;
    const rel = `${faviconDir}/${file}`;
    const bytes = probe.read(rel);
    const actual = pngDimensions(bytes);
    const claimed = parseFilenameSizes(file);
    if (actual && claimed && !sameDims(claimed, actual)) {
      problems.push(
        `${rel} is named for ${claimed.width}x${claimed.height} but its real PNG size is ${actual.width}x${actual.height}`
      );
    }
  }
  return problems;
}

/** Enforce the per-file and total byte budgets over the favicon directory. */
export function checkFaviconBudget(
  probe: AssetProbe,
  faviconDir = "static/favicons"
): string[] {
  const problems: string[] = [];
  let total = 0;
  for (const file of probe.list(faviconDir)) {
    if (!file.endsWith(".png")) continue;
    const bytes = probe.read(`${faviconDir}/${file}`);
    if (!bytes) continue;
    total += bytes.byteLength;
    if (bytes.byteLength > PER_FILE_BUDGET_BYTES) {
      problems.push(
        `${faviconDir}/${file} is ${(bytes.byteLength / 1024).toFixed(0)}KB, over the ${(
          PER_FILE_BUDGET_BYTES / 1024
        ).toFixed(0)}KB per-file budget`
      );
    }
  }
  if (total > TOTAL_FAVICON_BUDGET_BYTES) {
    problems.push(
      `favicon payload is ${(total / 1024).toFixed(0)}KB, over the ${(
        TOTAL_FAVICON_BUDGET_BYTES / 1024
      ).toFixed(0)}KB total budget`
    );
  }
  return problems;
}

function makeDiskProbe(publicDir: string): AssetProbe {
  return {
    read(relPath: string): Uint8Array | null {
      try {
        const buf = readFileSync(path.join(publicDir, relPath));
        return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
      } catch {
        return null;
      }
    },
    list(relDir: string): string[] {
      try {
        return readdirSync(path.join(publicDir, relDir));
      } catch {
        return [];
      }
    },
  };
}

export function runStaticAssetCheck(publicDir: string): string[] {
  const probe = makeDiskProbe(publicDir);
  const raw = probe.read("static/favicons/site.webmanifest");
  if (!raw) return ["site.webmanifest is missing from public/static/favicons"];
  let manifest: unknown;
  try {
    manifest = JSON.parse(new TextDecoder().decode(raw));
  } catch (error) {
    return [`site.webmanifest is not valid JSON: ${(error as Error).message}`];
  }
  return [...checkManifestIcons(manifest, probe), ...checkFaviconBudget(probe)];
}

function main(): void {
  // Resolve `apps/client/public` relative to this file (…/src/scripts/… → up two
  // to the client root, then into `public`), so the check works from any cwd the
  // lint task or CI happens to invoke it from.
  const publicDir = new URL("../../public/", import.meta.url).pathname;
  const problems = runStaticAssetCheck(publicDir);
  if (problems.length > 0) {
    console.error("static-asset guard found problems:");
    for (const problem of problems) console.error(`  - ${problem}`);
    process.exit(1);
  }
  console.log(
    "static-asset guard: manifest, PNG dimensions, and byte budgets all check out"
  );
}

if (import.meta.main) main();
