"use client";

import { useEffect } from "react";
import { captureError } from "@/lib/observability";

/**
 * Catches failures in the root layout itself, where `error.tsx` cannot run.
 * It replaces <html>, so it carries its own minimal styling rather than
 * relying on anything the layout would have provided.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    captureError(error, { scope: "global-error", digest: error.digest });
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
          fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif",
          color: "#18181b",
          background: "#ffffff",
        }}
      >
        <main style={{ maxWidth: "34rem" }}>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 600, margin: 0 }}>
            This page failed to load
          </h1>
          <p style={{ lineHeight: 1.75, color: "#52525b" }}>
            Something went wrong before the page could render.
          </p>
          {error.digest && (
            <p style={{ fontFamily: "ui-monospace, monospace", fontSize: 12 }}>
              Reference: {error.digest}
            </p>
          )}
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "1rem",
              padding: "0.5rem 0.875rem",
              borderRadius: 4,
              border: 0,
              background: "#18181b",
              color: "#fff",
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
