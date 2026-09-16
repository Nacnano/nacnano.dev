/**
 * Static chrome for /activity. Living in a layout (not the page) means the
 * heading and intro render immediately and survive the streaming swap — so the
 * loading skeleton only fills the feed slot below and nothing jumps when the
 * data arrives.
 */
export default function ActivityLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="py-12 sm:py-16">
      <h1 className="text-[1.75rem] leading-[1.2] font-semibold tracking-[-0.022em] text-zinc-900 sm:text-[2.125rem] dark:text-zinc-100">
        Activity
      </h1>
      <p className="max-w-measure mt-4 text-[1.0625rem] leading-[1.75] text-zinc-600 dark:text-zinc-400">
        A public record of visits to this site. No cookies, no IP stored — just country,
        city, and an approximate location.
      </p>
      <div className="mt-12">{children}</div>
    </div>
  );
}
