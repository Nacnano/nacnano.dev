/**
 * Streaming fallback for /activity, shown while the server awaits the whole
 * retained window from the store.
 *
 * It mirrors the *initial* render of ActivityFeed so the streamed swap barely
 * moves the page. Anything the feed can only know after the store read (the
 * counts, country codes, page paths, relative times, the visit rows) is a
 * decorative bar sized to the real line box. Everything the feed renders from
 * hard-coded strings — the "Most visited" / "Recent visits" headings, the stat
 * labels, the reveal buttons, the trailing "over N days" line — is drawn as the
 * *real* text, so the skeleton reflects the actual copy instead of a bar where
 * known words will appear. Matching Tailwind sizes (text-xs / text-2xl /
 * text-base / text-[0.9375rem], the same tracking and two-line rows) is what
 * keeps the swap from jumping.
 */

function Bar({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`rounded bg-zinc-200 motion-safe:animate-pulse dark:bg-zinc-800 ${className ?? ""}`}
    />
  );
}

/** The globe slot — the same lit sphere the fixed placeholder draws, so the
 *  server-streamed frame looks like the globe (a sized disc) rather than a
 *  white ring, and matches the client placeholder it swaps into. */
function GlobeSlot() {
  return (
    <div aria-hidden="true" className="relative aspect-square w-full">
      <div className="absolute inset-[11%] rounded-full bg-[radial-gradient(circle_at_38%_32%,#ffffff_0%,#e4e4e7_58%,#d4d4d8_100%)] shadow-[inset_0_0_0_1px_rgba(37,86,218,0.06),0_0_28px_rgba(37,86,218,0.18)] dark:bg-[radial-gradient(circle_at_38%_32%,#3f3f46_0%,#27272a_58%,#18181b_100%)] dark:shadow-[inset_0_0_0_1px_rgba(120,150,255,0.10),0_0_28px_rgba(96,140,255,0.16)]" />
    </div>
  );
}

/** Country codes and their counts are only known after the read, so each pill
 *  is a pair of bars sized to the real `font-mono text-xs` code + `×count`. */
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

/** The label is a fixed string, so it renders as the real `<dt>`; only the
 *  numeric value — which the feed can't know pre-read — is a bar, sized to
 *  Stat's `dd` (text-2xl → 2rem line box) with the same mt-1. */
const STATS: { label: string; valueWidth: string }[] = [
  { label: "Visits", valueWidth: "w-16" },
  { label: "Countries", valueWidth: "w-10" },
  { label: "Tracked since", valueWidth: "w-24" },
];

function StatsRow() {
  return (
    <div className="mt-6 flex flex-wrap gap-x-10 gap-y-4">
      {STATS.map((stat) => (
        <div key={stat.label}>
          <div className="font-mono text-xs tracking-[0.08em] text-zinc-500 uppercase dark:text-zinc-400">
            {stat.label}
          </div>
          <Bar className={`mt-1 h-8 ${stat.valueWidth}`} />
        </div>
      ))}
    </div>
  );
}

/** The heading is a hard-coded string, so it is the real text — same
 *  `text-base font-semibold tracking` as the feed's `<h2>`, keeping its line
 *  box identical across the swap. */
function SectionHeading({ children }: { children: string }) {
  return (
    <h2 className="text-base font-semibold tracking-[-0.011em] text-zinc-900 dark:text-zinc-100">
      {children}
    </h2>
  );
}

/** A list of hairline rows in the real two-line shape (0.9375rem title + text-xs
 *  subtitle) so each row is as tall as a loaded one. */
function ListRows({ rows }: { rows: number }) {
  return (
    <div className="mt-2 divide-y divide-zinc-200 border-t border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-baseline justify-between gap-4 py-2.5">
          <div className="min-w-0 flex-1">
            <Bar className="h-5 w-1/2" />
            <Bar className="mt-0.5 h-4 w-1/3" />
          </div>
          <Bar className="h-4 w-10 shrink-0" />
        </div>
      ))}
    </div>
  );
}

/** A disabled mirror of the feed's bordered reveal button, carrying the real
 *  label so the skeleton shows the same control (and text) the reader will get. */
function ButtonBar({ children }: { children: string }) {
  return (
    <span
      aria-hidden="true"
      className="inline-flex cursor-default items-center gap-2 rounded border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 dark:border-zinc-700 dark:text-zinc-300"
    >
      {children}
    </span>
  );
}

export default function ActivityLoading() {
  return (
    <div
      role="status"
      className="flex flex-col gap-10 lg:flex-row lg:items-start lg:gap-14"
    >
      <div className="mx-auto w-full max-w-[22rem] shrink-0">
        <GlobeSlot />
        <CountryPills />
      </div>

      <div className="min-w-0 flex-1">
        <StatsRow />

        <section className="mt-10">
          <SectionHeading>Most visited</SectionHeading>
          <ListRows rows={6} />
          <div className="mt-4 flex justify-center">
            <ButtonBar>Show more pages</ButtonBar>
          </div>
        </section>

        <section className="mt-10">
          <SectionHeading>Recent visits</SectionHeading>
          <ListRows rows={6} />
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
            <ButtonBar>Show more visits</ButtonBar>
          </div>
        </section>

        {/* The feed's real first paint keeps this clock-dependent line invisible
            (an `over 0 days` placeholder) until hydration, so mirror that exactly
            — a visible bar here would be copy the loaded page never shows. */}
        <p className="mt-8 font-mono text-xs tracking-[0.08em] text-zinc-500 uppercase dark:text-zinc-400">
          <span className="invisible">over&nbsp;0&nbsp;days</span>
        </p>
      </div>

      <span className="sr-only">Loading…</span>
    </div>
  );
}
