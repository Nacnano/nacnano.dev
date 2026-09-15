/**
 * Server-only runtime configuration for the Redis-backed features.
 *
 * Until now the store was enabled by a pair of truthiness checks scattered over
 * `activityRedis`, `rateLimit`, and `activity`: with exactly one credential set
 * the site silently behaved as a static deploy, and the rate limiter fell back
 * to a *public*, predictable salt (`"nacnano.dev"`). Both are the kind of
 * misconfiguration that is invisible until it costs you — a half-configured
 * live deployment that quietly records nothing, or a salt an attacker can
 * precompute to target one visitor's bucket.
 *
 * This is the single authoritative place those decisions live. It is server-only
 * (guarded below), so credentials and the salt can never reach the browser bundle.
 *
 * The contract:
 *   - Neither credential present  -> disabled (a genuinely static deploy; OK).
 *   - Exactly one present         -> throw: a partial live config is a bug, not
 *                                    a reason to silently drop to static.
 *   - Both present                -> require a strong `VISIT_IP_SALT` and (outside
 *                                    tests) an HTTPS Redis URL, or throw.
 *
 * Error messages always name the offending variable but never echo its value.
 */

// Server-only by construction: it reads process.env and holds Upstash
// credentials and the IP salt. The codebase marks no npm `server-only` package,
// so the guard is explicit — an accidental import from a client component fails
// loudly here instead of shipping a secret into the browser bundle. (The
// client-side bridge is the plain boolean `isActivityLive()` in `activity.ts`.)
if (typeof window !== "undefined") {
  throw new Error("runtimeConfig is server-only and must not be imported by client code");
}

const MIN_SALT_ENTROPY = 32;

export type RedisRuntimeConfig =
  | { mode: "disabled" }
  | {
      mode: "configured";
      url: string;
      token: string;
      ipSalt: string;
      /** Namespace for every key this app writes, for test/workspace isolation. */
      keyPrefix: string;
    };

/** Thrown for an invalid/incomplete Redis configuration. Names the variable, never the secret. */
export class RedisConfigError extends Error {
  readonly variable: string;
  constructor(variable: string, message: string) {
    super(message);
    this.name = "RedisConfigError";
    this.variable = variable;
  }
}

type Env = Record<string, string | undefined>;

function isTestEnvironment(env: Env): boolean {
  return env.NODE_ENV === "test";
}

function validate(env: Env): RedisRuntimeConfig {
  const url = (env.UPSTASH_REDIS_REST_URL ?? "").trim();
  const token = (env.UPSTASH_REDIS_REST_TOKEN ?? "").trim();
  const hasUrl = url.length > 0;
  const hasToken = token.length > 0;

  // The only genuinely-supported static configuration: neither credential set.
  if (!hasUrl && !hasToken) return { mode: "disabled" };

  if (!hasUrl) {
    throw new RedisConfigError(
      "UPSTASH_REDIS_REST_URL",
      "UPSTASH_REDIS_REST_TOKEN is set but UPSTASH_REDIS_REST_URL is missing — " +
        "set both credentials or neither (a static deploy)."
    );
  }
  if (!hasToken) {
    throw new RedisConfigError(
      "UPSTASH_REDIS_REST_TOKEN",
      "UPSTASH_REDIS_REST_URL is set but UPSTASH_REDIS_REST_TOKEN is missing — " +
        "set both credentials or neither (a static deploy)."
    );
  }

  // A live deployment must hash client IPs with a private, high-entropy salt.
  // The previous public fallback made rate-limit buckets precomputable.
  const ipSalt = (env.VISIT_IP_SALT ?? "").trim();
  if (ipSalt.length < MIN_SALT_ENTROPY) {
    throw new RedisConfigError(
      "VISIT_IP_SALT",
      "VISIT_IP_SALT must be set to at least " +
        `${MIN_SALT_ENTROPY} characters of entropy when Redis is configured ` +
        "(generate one with `openssl rand -base64 32`)."
    );
  }

  // Upstash tokens over cleartext would be worse than no limiter at all.
  if (!isTestEnvironment(env) && !/^https:\/\//i.test(url)) {
    throw new RedisConfigError(
      "UPSTASH_REDIS_REST_URL",
      "UPSTASH_REDIS_REST_URL must use https:// outside a test environment."
    );
  }

  const keyPrefix = (env.UPSTASH_KEY_PREFIX ?? "").trim();
  return { mode: "configured", url, token, ipSalt, keyPrefix };
}

// Cached against the exact env tuple it was derived from, so a test that mutates
// the environment is re-validated rather than served a stale verdict — while the
// hot path (unchanged env) still avoids re-parsing. The cache holds a successful
// config OR a memoised failure, so a persistent misconfiguration is not
// re-derived (and its Error not re-allocated) on every request — the beacon hits
// this on every page view.
type ConfigCache = { key: string; config?: RedisRuntimeConfig; error?: unknown };
let cache: ConfigCache | undefined;

function envKey(env: Env): string {
  return [
    env.UPSTASH_REDIS_REST_URL ?? "",
    env.UPSTASH_REDIS_REST_TOKEN ?? "",
    env.VISIT_IP_SALT ?? "",
    env.UPSTASH_KEY_PREFIX ?? "",
    env.NODE_ENV ?? "",
  ].join("\u0000");
}

/**
 * The validated runtime configuration. Throws `RedisConfigError` for an invalid
 * live configuration; callers that must never crash (static-mode rendering)
 * gate on `isActivityLive()` first, which only reports whether credentials are
 * present and never throws.
 */
export function getRuntimeConfig(env: Env = process.env): RedisRuntimeConfig {
  const key = envKey(env);
  if (cache && cache.key === key) {
    // Re-throw the memoised failure rather than re-running `validate()` — the
    // beacon reaches this on every page view, and re-deriving an unchanged
    // verdict is pure waste.
    if (cache.error !== undefined) throw cache.error;
    return cache.config as RedisRuntimeConfig;
  }
  try {
    const config = validate(env);
    cache = { key, config };
    return config;
  } catch (error) {
    // The failed verdict is cached under the same env key as a good one, so this
    // can never latch a fixed config off forever: correcting the environment
    // changes the key and `validate` runs again.
    cache = { key, error };
    throw error;
  }
}

/** Drop the cached verdict so tests can re-derive config after mutating env. */
export function resetRuntimeConfigCache(): void {
  cache = undefined;
}

/**
 * Apply the configured namespace to a logical key. An empty prefix leaves keys
 * byte-identical to before, so production keys are unchanged unless an operator
 * opts in — the isolation live-store tests and parallel workspaces rely on.
 */
export function namespacedKey(logical: string, config = getRuntimeConfig()): string {
  return config.mode === "configured" && config.keyPrefix
    ? `${config.keyPrefix}:${logical}`
    : logical;
}
