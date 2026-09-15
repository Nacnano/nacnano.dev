import { afterEach, describe, expect, it } from "bun:test";
import { captureError, setReportSink } from "./observability";

type Call = { url: string; init: RequestInit };
let calls: Call[] = [];

function stubFetch() {
  calls = [];
  const original = globalThis.fetch;
  globalThis.fetch = (async (url: string | URL | Request, init: RequestInit = {}) => {
    calls.push({ url: String(url), init });
    return new Response(null, { status: 204 });
  }) as unknown as typeof fetch;
  return () => {
    globalThis.fetch = original;
  };
}

function silenceConsole() {
  const original = console.error;
  const lines: string[] = [];
  console.error = (...args: unknown[]) => {
    lines.push(args.map(String).join(" "));
  };
  return { lines, restore: () => (console.error = original) };
}

describe("captureError", () => {
  afterEach(() => {
    // `mock`-free cleanup: these branches only mutate globals the module reads
    // lazily, so restoring them here keeps the next file (and the SSR pass that
    // asserts `window === undefined`) honest.
    delete (globalThis as { window?: unknown }).window;
    delete (globalThis as { location?: unknown }).location;
  });

  it("writes a structured line and never throws (log-only when no endpoint)", () => {
    const { lines, restore } = silenceConsole();
    const restoreFetch = stubFetch();
    try {
      expect(() => captureError(new Error("boom"), { route: "test" })).not.toThrow();
      expect(() => captureError("plain string", { route: "test" })).not.toThrow();
      // Server branch with no ERROR_REPORT_URL configured → nothing dispatched.
      expect(calls).toHaveLength(0);
    } finally {
      restore();
      restoreFetch();
    }

    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain("[error]");
    expect(lines[0]).toContain("boom");
    // The non-Error path still serialises to a message.
    expect(lines[1]).toContain("plain string");
  });

  it("POSTs the payload to the endpoint on the server, with a timeout", () => {
    const url = process.env.ERROR_REPORT_URL;
    process.env.ERROR_REPORT_URL = "https://sink.example/report";
    const { restore } = silenceConsole();
    const restoreFetch = stubFetch();
    try {
      captureError(new Error("kaboom"), { scope: "unit" });
    } finally {
      restore();
      restoreFetch();
      if (url === undefined) delete process.env.ERROR_REPORT_URL;
      else process.env.ERROR_REPORT_URL = url;
    }

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://sink.example/report");
    expect(calls[0]?.init.method).toBe("POST");
    // The codebase's own convention: a fire-and-forget report never hangs.
    expect(calls[0]?.init.signal).toBeInstanceOf(AbortSignal);
    const body = JSON.parse(String(calls[0]?.init.body)) as Record<string, unknown>;
    expect(body.message).toBe("kaboom");
    expect(body.scope).toBe("unit");
  });

  it("routes browser errors to our own origin without leaking the endpoint", () => {
    // Force the client branch.
    (globalThis as { window?: unknown }).window = {};
    (globalThis as { location?: { href: string } }).location = {
      href: "https://nacnano.dev/activity",
    };
    process.env.ERROR_REPORT_URL = "https://secret-sink.example/report";
    const { restore } = silenceConsole();
    const restoreFetch = stubFetch();
    try {
      captureError(new Error("client boom"), { scope: "route-error", digest: "abc123" });
    } finally {
      restore();
      restoreFetch();
      delete process.env.ERROR_REPORT_URL;
    }

    expect(calls).toHaveLength(1);
    // Same-origin — `connect-src 'self'` covers it, and the real endpoint never
    // appears anywhere in what the browser sends.
    expect(calls[0]?.url).toBe("/api/report");
    expect(calls[0]?.init.keepalive).toBe(true);
    const body = String(calls[0]?.init.body);
    expect(body).not.toContain("secret-sink.example");
    // `stack` is never forwarded from the browser.
    const sent = JSON.parse(body) as Record<string, unknown>;
    expect(sent.stack).toBeUndefined();
    expect(sent.message).toBe("client boom");
    expect(sent.scope).toBe("route-error");
    expect(sent.digest).toBe("abc123");
    expect(sent.url).toBe("https://nacnano.dev/activity");
  });

  it("never re-enters itself while a dispatch is in flight", () => {
    // A sink whose request handler synchronously calls captureError again must
    // not fan out indefinitely — the de-dup flag short-circuits the nested call.
    (globalThis as { window?: unknown }).window = {};
    (globalThis as { location?: { href: string } }).location = { href: "https://x.test" };
    const { restore } = silenceConsole();
    const original = globalThis.fetch;
    let depth = 0;
    let maxDepth = 0;
    globalThis.fetch = (async () => {
      depth += 1;
      maxDepth = Math.max(maxDepth, depth);
      // Re-entrant call while the outer dispatch is still "reporting".
      captureError(new Error("nested"), { scope: "loop" });
      depth -= 1;
      return new Response(null, { status: 204 });
    }) as unknown as typeof fetch;
    try {
      captureError(new Error("outer"), { scope: "loop" });
      // fetch is invoked synchronously by dispatch; await the microtask so the
      // async body above runs at least once before we assert.
      // (The nested captureError is what would have recursed had the guard been
      // absent — the guard makes that nested call a no-op regardless of timing.)
    } finally {
      restore();
      globalThis.fetch = original;
    }
    expect(maxDepth).toBeLessThanOrEqual(1);
  });

  describe("server report sink", () => {
    function silenceConsole() {
      const original = console.error;
      console.error = () => {};
      return () => (console.error = original);
    }

    it("invokes a registered sink with the serialized payload on the server", () => {
      const received: Record<string, unknown>[] = [];
      setReportSink((payload) => received.push(payload));
      const restore = silenceConsole();
      try {
        // Server branch (window is undefined under bun test); no ERROR_REPORT_URL,
        // so the sink is the only delivery and must still receive the payload.
        captureError(new Error("sink me"), { scope: "activity-feed" });
      } finally {
        restore();
        setReportSink(null);
      }
      expect(received).toHaveLength(1);
      expect(received[0]).toMatchObject({
        message: "sink me",
        scope: "activity-feed",
        name: "Error",
      });
    });

    it("does not invoke the sink from the browser branch", () => {
      (globalThis as { window?: unknown }).window = {};
      (globalThis as { location?: { href: string } }).location = {
        href: "https://x.test",
      };
      let called = 0;
      setReportSink(() => {
        called += 1;
      });
      const restore = silenceConsole();
      const originalFetch = globalThis.fetch;
      globalThis.fetch = (async () =>
        new Response(null, { status: 204 })) as unknown as typeof fetch;
      try {
        captureError(new Error("browser"), { scope: "route-error" });
      } finally {
        restore();
        globalThis.fetch = originalFetch;
        setReportSink(null);
        delete (globalThis as { window?: unknown }).window;
        delete (globalThis as { location?: { href: string } }).location;
      }
      expect(called).toBe(0);
    });
  });
});
