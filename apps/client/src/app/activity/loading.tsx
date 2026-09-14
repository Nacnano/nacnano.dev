/**
 * Streaming fallback for /activity, shown while the server awaits the first
 * page of visits from the store. Mirrors the feed's real layout — a globe slot
 * and a list of hairline rows — so the swap does not jump.
 */
export default function ActivityLoading() {
  return (
    <div
      role="status"
      className="flex flex-col gap-10 lg:flex-row lg:items-start lg:gap-14"
    >
      <div className="mx-auto w-full max-w-[22rem] shrink-0">
        <div className="aspect-square w-full rounded-full border border-zinc-200 motion-safe:animate-pulse dark:border-zinc-800" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="h-4 w-2/3 rounded bg-zinc-200 motion-safe:animate-pulse dark:bg-zinc-800" />
        <div className="mt-6 flex gap-10">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-8 w-16 rounded bg-zinc-200 motion-safe:animate-pulse dark:bg-zinc-800"
            />
          ))}
        </div>
        <div className="mt-10 divide-y divide-zinc-200 border-t border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
          {/* Six rows is a visual rhythm choice, not HEAD_LIMIT (30); the real
              count is unknown until the page resolves. */}
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-baseline justify-between gap-4 py-2.5">
              <div className="h-3.5 w-1/2 rounded bg-zinc-200 motion-safe:animate-pulse dark:bg-zinc-800" />
              <div className="h-3 w-10 rounded bg-zinc-200 motion-safe:animate-pulse dark:bg-zinc-800" />
            </div>
          ))}
        </div>
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
