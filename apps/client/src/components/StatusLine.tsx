import siteMetadata from "@/data/siteMetadata";

/**
 * The system's signature component (DESIGN.md ▸ The Status Line): a 6px Signal
 * Blue dot followed by one line of mono, uppercase, tabular micro-type stating
 * the author's current availability. It is the only place the accent is used as
 * a fill, and the reason is that it is the one fact a first-time visitor —
 * usually a recruiter on a phone — must not miss. Rendered on the home and
 * about heroes, directly under the name.
 */
const StatusLine = () => (
  <p className="mt-2 flex items-center gap-2 font-mono text-xs tracking-[0.08em] text-zinc-500 uppercase dark:text-zinc-400">
    <span
      aria-hidden="true"
      className="bg-accent-600 dark:bg-accent-300 inline-block h-1.5 w-1.5 shrink-0 rounded-full"
    />
    {siteMetadata.status}
  </p>
);

export default StatusLine;
