import { describe, it, expect, beforeEach, afterAll, mock } from "bun:test";

/**
 * Behaviour tests for `GET /api/health` — the readiness probe an uptime monitor
 * hits. The runtime configuration and the store client are mocked so we can
 * drive every branch the operator cares about (static / live-up / live-down /
 * misconfigured) deterministically, without a real Upstash instance.
 */
import * as activityRedis from "@/lib/activityRedis";
import * as runtimeConfig from "@/lib/runtimeConfig";

const originalRedis = { ...activityRedis };
const originalConfig = { ...runtimeConfig };

type ConfigResult =
  | { mode: "disabled" }
  | { mode: "configured"; url: string; token: string; ipSalt: string; keyPrefix: string }
  | { throw: unknown };

let config: ConfigResult = { mode: "disabled" };
let pingBehaviour: "up" | "down" | "throw" = "up";

mock.module("@/lib/runtimeConfig", () => ({
  ...originalConfig,
  getRuntimeConfig: () => {
    if ("throw" in config) throw config.throw;
    return config;
  },
}));
mock.module("@/lib/activityRedis", () => ({
  ...originalRedis,
  getActivityClient: () => {
    if (pingBehaviour === "throw") throw new Error("client build failed");
    return {
      ping: async () =>
        pingBehaviour === "up"
          ? "PONG"
          : (() => {
              throw new Error("down");
            })(),
    };
  },
}));

import { GET } from "./route";

function reset() {
  config = { mode: "disabled" };
  pingBehaviour = "up";
}

beforeEach(reset);
afterAll(() => {
  mock.module("@/lib/activityRedis", () => originalRedis);
  mock.module("@/lib/runtimeConfig", () => originalConfig);
  mock.restore();
});

async function body(res: Response) {
  return (await res.json()) as { ok: boolean; mode: string; store: string };
}

describe("GET /api/health", () => {
  it("reports a healthy static deploy", async () => {
    config = { mode: "disabled" };
    const res = await GET();
    const json = await body(res);
    expect(json).toMatchObject({ ok: true, mode: "static", store: "n/a" });
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("reports live + up when the store answers", async () => {
    config = {
      mode: "configured",
      url: "https://x.example",
      token: "t",
      ipSalt: "s",
      keyPrefix: "",
    };
    pingBehaviour = "up";
    const json = await body(await GET());
    expect(json).toMatchObject({ ok: true, mode: "live", store: "up" });
  });

  it("reports live + down (and not ok) when the store refuses — the whole point", async () => {
    config = {
      mode: "configured",
      url: "https://x.example",
      token: "t",
      ipSalt: "s",
      keyPrefix: "",
    };
    pingBehaviour = "down";
    const json = await body(await GET());
    expect(json).toMatchObject({ ok: false, mode: "live", store: "down" });
  });

  it("reports misconfigured (and not ok) when the runtime config throws", async () => {
    config = {
      throw: new runtimeConfig.RedisConfigError("VISIT_IP_SALT", "too short"),
    };
    const json = await body(await GET());
    expect(json).toMatchObject({ ok: false, mode: "misconfigured" });
    // The whole reason for the endpoint: a broken live config is visible here,
    // not hidden behind an empty-looking feed.
    expect(json.store).not.toBe("up");
  });

  it("names no variable and echoes no value", async () => {
    config = {
      throw: new runtimeConfig.RedisConfigError("VISIT_IP_SALT", "must be >= 32 chars"),
    };
    const res = await GET();
    const text = await res.text();
    expect(text).not.toContain("VISIT_IP_SALT");
    expect(text).not.toContain("must be");
  });
});
