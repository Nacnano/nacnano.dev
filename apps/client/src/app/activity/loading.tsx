/**
 * Streaming fallback for /activity, shown while the server awaits the first
 * page of visits from the store.
 *
 * It mirrors the *initial* client render of ActivityFeed — globe slot, a row of
 * country pills, the stat line, "Most visited", "Recent visits", and the
 * trailing "over N days" line — down to the Tailwind line boxes (matching
 * font sizes / line-heights and two-line rows). The goal is that the streamed
 * swap from this skeleton into the real feed barely moves the page, instead of
 * jumping a short placeholder up into a tall feed (a large cumulative layout
 * shift). Bars are decorative; the single `role="status"` + `sr-only` label
 * carries the announcement.
 */

function Bar({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`rounded bg-zinc-200 motion-safe:animate-pulse dark:bg-zinc-800 ${className ?? ""}`}
    />
  );
}

function CountryPills() {
  return (
    <div className="mt-6 flex flex-wrap justify-center gap-1.5">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-1.5 rounded border border-zinc-200 px-2 py-1 dark:border-zinc-800"
        >
          <Bar className="h-4 w-5" />
          <Bar className="h-4 w-4" />
        </div>
      ))}
    </div>
  );
}

function StatsRow() {
  return (
    <div className="mt-6 flex flex-wrap gap-x-10 gap-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        // label (text-xs) + value (text-2xl), sized to Stat's dt/dd line boxes.
        <div key={i}>
          <Bar className="h-4 w-16" />
          <Bar className="mt-1 h-8 w-12" />
        </div>
      ))}
    </div>
  );
}

function SectionHeading() {
  return <Bar className="h-6 w-28" />;
}

/** A list of hairline rows; each row is the real two-line shape (0.9375rem
 *  title + text-xs subtitle) so its height matches a loaded row. */
function ListRows({ rows }: { rows: number }) {
  return (
    <div className="mt-2 divide-y divide-zinc-200 border-t border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-baseline justify-between gap-4 py-2.5">
          <div className="min-w-0 flex-1">
            <Bar className="h-5 w-1/2" />
            <Bar className="mt-1 h-4 w-1/3" />
          </div>
          <Bar className="h-4 w-10 shrink-0" />
        </div>
      ))}
    </div>
  );
}

export default function ActivityLoading() {
  return (
    <div
      role="status"
      className="flex flex-col gap-10 lg:flex-row lg:items-start lg:gap-14"
    >
      <div className="mx-auto w-full max-w-[22rem] shrink-0">
        <div className="aspect-square w-full rounded-full border border-zinc-200 motion-safe:animate-pulse dark:border-zinc-800" />
        <CountryPills />
      </div>

      <div className="min-w-0 flex-1">
        <StatsRow />

        <section className="mt-10">
          <SectionHeading />
          <ListRows rows={6} />
          <div className="mt-4 flex justify-center">
            <Bar className="h-9 w-32" />
          </div>
        </section>

        <section className="mt-10">
          <SectionHeading />
          <ListRows rows={6} />
          <div className="flex justify-center py-8">
            <Bar className="h-9 w-40" />
          </div>
        </section>

        <Bar className="mt-8 h-4 w-24" />
      </div>

      <span className="sr-only">Loading…</span>
    </div>
  );
}
