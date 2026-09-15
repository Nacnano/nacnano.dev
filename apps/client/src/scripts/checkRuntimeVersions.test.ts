import { describe, expect, it } from "bun:test";
import {
  bunFromPackageManager,
  checkRuntimeVersions,
  type ReleaseVersions,
} from "./checkRuntimeVersions";

function fixture(overrides: Partial<ReleaseVersions> = {}): ReleaseVersions {
  return {
    nvmrc: "22\n",
    rootPackageJson: JSON.stringify({
      engines: { node: "22.x" },
      packageManager: "bun@1.3.14",
    }),
    clientPackageJson: JSON.stringify({
      engines: { node: "22.x" },
      devDependencies: { "@types/node": "^22" },
    }),
    ciWorkflow: "node-version: 22\nbun-version: 1.3.14\n",
    bunLock: JSON.stringify({ lockfileVersion: 1 }),
    ...overrides,
  };
}

describe("checkRuntimeVersions", () => {
  it("passes when the whole stack agrees", () => {
    expect(checkRuntimeVersions(fixture())).toEqual([]);
  });

  it("catches @types/node drifting off the runtime Node major", () => {
    const bad = fixture({
      clientPackageJson: JSON.stringify({
        engines: { node: "22.x" },
        devDependencies: { "@types/node": "^26.5.1" },
      }),
    });
    const mismatches = checkRuntimeVersions(bad);
    expect(mismatches.map((m) => m.check)).toContain(".nvmrc vs @types/node");
  });

  it("catches CI node-version drift", () => {
    expect(
      checkRuntimeVersions(
        fixture({ ciWorkflow: "node-version: 20\nbun-version: 1.3.14\n" })
      )
    ).toContainEqual({
      check: "CI node-version vs .nvmrc",
      expected: "22",
      actual: "20",
    });
  });

  it("catches a bun-version that no longer matches packageManager", () => {
    const mismatches = checkRuntimeVersions(
      fixture({ ciWorkflow: "node-version: 22\nbun-version: 1.2.0\n" })
    );
    expect(
      mismatches.find((m) => m.check === "CI bun-version vs packageManager")
    ).toEqual({
      check: "CI bun-version vs packageManager",
      expected: "1.3.14",
      actual: "1.2.0",
    });
  });

  it("catches drift in a SECOND job, not just the first", () => {
    // ci.yml pins node/bun in both `verify` and `e2e`; reading only the first
    // occurrence let the e2e job drift off the runtime entirely.
    const mismatches = checkRuntimeVersions(
      fixture({
        ciWorkflow:
          "node-version: 22\nbun-version: 1.3.14\nnode-version: 20\nbun-version: 1.3.14\n",
      })
    );
    expect(mismatches.map((m) => m.check)).toContain("CI node-version vs .nvmrc");
    expect(
      mismatches.find((m) => m.check === "CI node-version vs .nvmrc")?.actual
    ).toMatch(/inconsistent/);
  });

  it("catches a lockfile bumped past v1", () => {
    const mismatches = checkRuntimeVersions(
      fixture({ bunLock: JSON.stringify({ lockfileVersion: 2 }) })
    );
    expect(mismatches.map((m) => m.check)).toContain("bun.lock lockfileVersion");
  });
});

describe("bunFromPackageManager", () => {
  it("extracts the pinned version and rejects other shapes", () => {
    expect(bunFromPackageManager("bun@1.3.14")).toBe("1.3.14");
    expect(bunFromPackageManager("bun@1.3.14+sha")).toBe("1.3.14");
    expect(bunFromPackageManager("npm@10")).toBe("");
    expect(bunFromPackageManager(undefined)).toBe("");
  });
});
