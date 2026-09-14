"use client";

import { useEffect } from "react";
import CustomLink from "@/components/Link";
import { captureError } from "@/lib/observability";
import siteMetadata from "@/data/siteMetadata";

/**
 * Route-level boundary. Without this, a throw in any server component renders
 * Next's default error screen, which carries none of the site's design or a
 * way back.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    captureError(error, { scope: "route-error", digest: error.digest });
  }, [error]);

  return (
    <div className="py-24 sm:py-32">
      <h1 className="text-[1.75rem] font-semibold leading-[1.2] tracking-[-0.022em] text-zinc-900 dark:text-zinc-100 sm:text-[2.125rem]">
        That didn&rsquo;t work
      </h1>
      <p className="max-w-measure mt-4 text-[1.0625rem] leading-[1.75] text-zinc-600 dark:text-zinc-400">
        Something broke on my side rather than yours. Trying again sometimes helps; if it
        doesn&rsquo;t, tell me what you were looking for.
      </p>
      {error.digest && (
        <p className="mt-3 font-mono text-xs text-zinc-500 dark:text-zinc-400">
          Reference: {error.digest}
        </p>
      )}
      <div className="mt-7 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={reset}
          className="rounded bg-zinc-900 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          Try again
        </button>
        <CustomLink
          href="/"
          className="rounded border border-zinc-200 px-3.5 py-2 text-sm font-medium text-zinc-700 transition-colors hover:border-zinc-300 hover:text-zinc-900 dark:border-zinc-800 dark:text-zinc-300 dark:hover:border-zinc-700 dark:hover:text-zinc-100"
        >
          Back to the writing
        </CustomLink>
        <CustomLink
          href={`mailto:${siteMetadata.email}`}
          className="rounded border border-zinc-200 px-3.5 py-2 text-sm font-medium text-zinc-700 transition-colors hover:border-zinc-300 hover:text-zinc-900 dark:border-zinc-800 dark:text-zinc-300 dark:hover:border-zinc-700 dark:hover:text-zinc-100"
        >
          Email me
        </CustomLink>
      </div>
    </div>
  );
}
