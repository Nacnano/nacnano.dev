/**
 * Next.js instrumentation — runs once per server process at cold boot, and
 * *never* in the browser bundle. This is the correct seam for wiring server-only
 * behaviour into a module that is otherwise imported by client error boundaries:
 * `observability` exposes a sink setter, and we hand it the Discord transport
 * here, so `observability` itself never imports `discord` (which is
 * `server-only`, and which already imports `observability` — a static cycle).
 */
export async function register(): Promise<void> {
  // Only the Node.js runtime (not edge middleware) loads server-only modules.
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const [{ setReportSink }, { reportErrorToDiscord }] = await Promise.all([
    import("./lib/observability"),
    import("./lib/errorAlert"),
  ]);
  setReportSink(reportErrorToDiscord);
}
