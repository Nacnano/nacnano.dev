import { describe, expect, it } from "bun:test";
import {
  checkFaviconBudget,
  checkManifestIcons,
  parseDeclaredSizes,
  parseFilenameSizes,
  PER_FILE_BUDGET_BYTES,
  pngDimensions,
  TOTAL_FAVICON_BUDGET_BYTES,
  type AssetProbe,
} from "./checkStaticAssets";

/** Build the first 24 bytes of a valid PNG with the given IHDR dimensions. */
function pngHeader(width: number, height: number): Uint8Array {
  const bytes = new Uint8Array(24);
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  bytes.set(sig, 0);
  const view = new DataView(bytes.buffer);
  view.setUint32(8, 13, false); // IHDR chunk length
  bytes.set([0x49, 0x48, 0x44, 0x52], 12); // "IHDR"
  view.setUint32(16, width, false);
  view.setUint32(20, height, false);
  return bytes;
}

function probeWith(files: Record<string, Uint8Array>): AssetProbe {
  return {
    read: (rel) => files[rel] ?? null,
    list: (dir) =>
      Object.keys(files)
        .filter((k) => k.startsWith(`${dir}/`))
        .map((k) => k.slice(dir.length + 1))
        .filter((name) => !name.includes("/")),
  };
}

const manifest = {
  icons: [
    {
      src: "/static/favicons/android-chrome-192x192.png",
      sizes: "192x192",
      type: "image/png",
    },
  ],
};

describe("pngDimensions", () => {
  it("reads the IHDR width and height", () => {
    expect(pngDimensions(pngHeader(96, 96))).toEqual({ width: 96, height: 96 });
  });

  it("rejects too-short or non-PNG buffers", () => {
    expect(pngDimensions(null)).toBeNull();
    expect(pngDimensions(new Uint8Array(4))).toBeNull();
    expect(pngDimensions(new Uint8Array(24))).toBeNull();
  });
});

describe("size parsers", () => {
  it("parses declared and filename dimensions", () => {
    expect(parseDeclaredSizes("32x32")).toEqual({ width: 32, height: 32 });
    expect(parseDeclaredSizes(" 192x192 ")).toEqual({ width: 192, height: 192 });
    expect(parseDeclaredSizes(undefined)).toBeNull();
    expect(parseDeclaredSizes("any")).toBeNull();
    expect(parseFilenameSizes("favicon-32x32.png")).toEqual({ width: 32, height: 32 });
    expect(parseFilenameSizes("apple-touch-icon.png")).toBeNull();
  });
});

describe("checkManifestIcons", () => {
  it("passes when the declared file exists at the honest size", () => {
    const probe = probeWith({
      "static/favicons/android-chrome-192x192.png": pngHeader(192, 192),
    });
    expect(checkManifestIcons(manifest, probe)).toEqual([]);
  });

  it("fails when the manifest points at a file that is not on disk", () => {
    // The exact shipped defect: a root-relative `/android-chrome-96x96.png` the
    // manifest promised but that never existed under public.
    const probe = probeWith({});
    const problems = checkManifestIcons(
      {
        icons: [{ src: "/android-chrome-96x96.png", sizes: "96x96", type: "image/png" }],
      },
      probe
    );
    expect(problems.join("\n")).toMatch(/missing file/);
  });

  it("fails when the real PNG size disagrees with the declared sizes", () => {
    const probe = probeWith({
      "static/favicons/android-chrome-192x192.png": pngHeader(1928, 1928),
    });
    const problems = checkManifestIcons(manifest, probe);
    expect(problems.join("\n")).toMatch(
      /declares 192x192 but its real PNG size is 1928x1928/
    );
  });

  it("rejects a relative src that would not resolve under public", () => {
    const probe = probeWith({});
    const problems = checkManifestIcons(
      { icons: [{ src: "static/favicons/x.png", sizes: "16x16", type: "image/png" }] },
      probe
    );
    expect(problems.join("\n")).toMatch(/absolute/);
  });
});

describe("checkFaviconBudget", () => {
  function padTo(header: Uint8Array, size: number): Uint8Array {
    const out = new Uint8Array(size);
    out.set(header, 0);
    return out;
  }

  it("passes within budget", () => {
    const probe = probeWith({
      "static/favicons/favicon-32x32.png": pngHeader(32, 32),
      "static/favicons/android-chrome-192x192.png": pngHeader(192, 192),
    });
    expect(checkFaviconBudget(probe)).toEqual([]);
  });

  it("flags a single oversized file", () => {
    const probe = probeWith({
      "static/favicons/android-chrome-512x512.png": padTo(
        pngHeader(512, 512),
        PER_FILE_BUDGET_BYTES + 1
      ),
    });
    expect(checkFaviconBudget(probe).join("\n")).toMatch(/over the .*per-file budget/);
  });

  it("flags a payload that blows the total budget", () => {
    const many: Record<string, Uint8Array> = {};
    // Each file is under the per-file cap; together they exceed the total cap.
    const perFile = Math.floor(TOTAL_FAVICON_BUDGET_BYTES / 4) + 1;
    for (let i = 0; i < 4; i += 1) {
      many[`static/favicons/tile-${i}.png`] = padTo(pngHeader(100, 100), perFile);
    }
    expect(checkFaviconBudget(probeWith(many)).join("\n")).toMatch(/total budget/);
  });
});
