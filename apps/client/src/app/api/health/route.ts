import { NextResponse } from "next/server";
import { getActivityClient } from "@/lib/activityRedis";
import { getRuntimeConfig, RedisConfigError } from "@/lib/runtimeConfig";

/**
 * `GET /api/health` — a machine-readable readiness probe.
 *
 * Today the only visible symptom of a broken *live* configuration (a partial or
 * weak Upstash setup) is an activity feed that quietly renders empty, which is
 * indistinguishable from "nobody has visited". This endpoint names that failure
 * mode directly so any uptime monitor can catch a degraded deploy: it reports
 * the resolved mode and whether the store answers a ping, without ever naming a
 * variable or echoing a value — the same discretion `RedisConfigError` holds
 * itself to. `robots.ts` already disallows `/api/`.
 */
export const dynamic = "force-dynamic";

// The probe must answer fast even when the store is hanging: a monitor that has
// to wait out a TCP timeout is worse than useless. We bound the response time
// rather than the socket, so a dead store reads `down` quickly.
const PING_TIMEOUT_MS = 2_000;

async function pingStore(): Promise<"up" | "down"> {
  try {
    const client = getActivityClient();
    // No client despite a "configured" verdict is treated as down, not a crash.
    if (!client) return "down";
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error("ping timeout")), PING_TIMEOUT_MS);
    });
    try {
      await Promise.race([client.ping(), timeout]);
    } finally {
      // Never leave a dangling timer that could outlive the short request.
      if (timer !== undefined) clearTimeout(timer);
    }
    return "up";
  } catch {
    return "down";
  }
}

export async function GET(): Promise<Response> {
  let mode: "static" | "live" | "misconfigured" = "static";
  let store: "up" | "down" | "n/a" = "n/a";

  try {
    const config = getRuntimeConfig();
    if (config.mode === "configured") {
      mode = "live";
      store = await pingStore();
    }
  } catch (error) {
    // A partial/weak live config is the exact thing this endpoint exists to
    // surface — an operator sees `misconfigured`, not an empty-looking feed.
    if (error instanceof RedisConfigError) {
      mode = "misconfigured";
    } else {
      // Anything unexpected must not be swallowed into a green health check.
      mode = "misconfigured";
      store = "down";
    }
  }

  const ok = mode !== "misconfigured" && store !== "down";
  const commit = process.env.VERCEL_GIT_COMMIT_SHA ?? "unknown";

  return NextResponse.json(
    { ok, mode, store, commit },
    { headers: { "Cache-Control": "no-store" } }
  );
}
