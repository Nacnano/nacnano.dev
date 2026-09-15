import { describe, expect, it } from "bun:test";
import { RedisConfigError, getRuntimeConfig, namespacedKey } from "./runtimeConfig";

const URL_HTTPS = "https://fake.upstash.example";
const TOKEN = "super-secret-token";
const SALT = "an-adequately-long-random-salt-value-32+";

function configuredEnv(overrides: Record<string, string | undefined> = {}) {
  return {
    NODE_ENV: "test",
    UPSTASH_REDIS_REST_URL: URL_HTTPS,
    UPSTASH_REDIS_REST_TOKEN: TOKEN,
    VISIT_IP_SALT: SALT,
    ...overrides,
  };
}

describe("getRuntimeConfig", () => {
  it("is disabled when neither credential is present (a real static deploy)", () => {
    expect(getRuntimeConfig({ NODE_ENV: "production" })).toEqual({ mode: "disabled" });
    // A present-but-empty credential is the classic misconfig and counts as absent.
    expect(
      getRuntimeConfig({ UPSTASH_REDIS_REST_URL: "  ", UPSTASH_REDIS_REST_TOKEN: "" })
    ).toEqual({ mode: "disabled" });
  });

  it("throws when a URL is set without a token", () => {
    let error: unknown;
    try {
      getRuntimeConfig({ UPSTASH_REDIS_REST_URL: URL_HTTPS, NODE_ENV: "production" });
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(RedisConfigError);
    expect((error as RedisConfigError).variable).toBe("UPSTASH_REDIS_REST_TOKEN");
  });

  it("throws when a token is set without a URL", () => {
    try {
      getRuntimeConfig({ UPSTASH_REDIS_REST_TOKEN: TOKEN, NODE_ENV: "production" });
      throw new Error("expected a throw");
    } catch (e) {
      expect(e).toBeInstanceOf(RedisConfigError);
      expect((e as RedisConfigError).variable).toBe("UPSTASH_REDIS_REST_URL");
    }
  });

  it("refuses a configured result with no salt", () => {
    try {
      getRuntimeConfig(configuredEnv({ VISIT_IP_SALT: undefined }));
      throw new Error("expected a throw");
    } catch (e) {
      expect(e).toBeInstanceOf(RedisConfigError);
      expect((e as RedisConfigError).variable).toBe("VISIT_IP_SALT");
    }
  });

  it("refuses a weak (short) salt", () => {
    try {
      getRuntimeConfig(configuredEnv({ VISIT_IP_SALT: "too-short" }));
      throw new Error("expected a throw");
    } catch (e) {
      expect(e).toBeInstanceOf(RedisConfigError);
      expect((e as RedisConfigError).variable).toBe("VISIT_IP_SALT");
    }
  });

  it("requires https outside a test environment", () => {
    try {
      getRuntimeConfig(
        configuredEnv({
          NODE_ENV: "production",
          UPSTASH_REDIS_REST_URL: "http://insecure.example",
        })
      );
      throw new Error("expected a throw");
    } catch (e) {
      expect(e).toBeInstanceOf(RedisConfigError);
      expect((e as RedisConfigError).variable).toBe("UPSTASH_REDIS_REST_URL");
      expect((e as Error).message).toMatch(/https/);
    }
  });

  it("allows a non-https URL under an explicit test environment", () => {
    const config = getRuntimeConfig(
      configuredEnv({ NODE_ENV: "test", UPSTASH_REDIS_REST_URL: "http://localhost:6379" })
    );
    expect(config.mode).toBe("configured");
  });

  it("returns a configured result for a complete, valid configuration", () => {
    const config = getRuntimeConfig(configuredEnv({ NODE_ENV: "production" }));
    expect(config).toEqual({
      mode: "configured",
      url: URL_HTTPS,
      token: TOKEN,
      ipSalt: SALT,
      keyPrefix: "",
    });
  });

  it("names the offending variable without ever echoing a secret value", () => {
    const leaked = configuredEnv({
      VISIT_IP_SALT: "short",
      UPSTASH_REDIS_REST_TOKEN: TOKEN,
    });
    try {
      getRuntimeConfig(leaked);
      throw new Error("expected a throw");
    } catch (e) {
      const message = (e as Error).message;
      expect(message).toContain("VISIT_IP_SALT");
      expect(message).not.toContain(TOKEN);
      expect(message).not.toContain(SALT);
    }
  });
});

describe("namespacedKey", () => {
  it("is transparent with no prefix (production keys unchanged)", () => {
    expect(
      namespacedKey("activity:stream", {
        mode: "configured",
        url: "",
        token: "",
        ipSalt: SALT,
        keyPrefix: "",
      })
    ).toBe("activity:stream");
    expect(namespacedKey("activity:stream", { mode: "disabled" })).toBe(
      "activity:stream"
    );
  });

  it("prepends the configured namespace", () => {
    expect(
      namespacedKey("activity:stream", {
        mode: "configured",
        url: "",
        token: "",
        ipSalt: SALT,
        keyPrefix: "ci:42",
      })
    ).toBe("ci:42:activity:stream");
  });
});
