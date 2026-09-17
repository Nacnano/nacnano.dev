/**
 * Static chrome for /activity. Living in a layout (not the page) means the
 * heading and intro render immediately and survive the streaming swap — so the
 * loading skeleton only fills the feed slot below and nothing jumps when the
 * data arrives.
 */
import { isActivityLive } from "@/lib/activity";

export default function ActivityLayout({ children }: { children: React.ReactNode }) {
  // Whether the deployment is wired to the live store. A deployment-level env
  // gate, so it is honest at build/render time; the pulse is pure CSS, so this
  // needs no client JS and never disturbs the early paint.
  const live = isActivityLive();
  return (
    <div className="animate-rise pt-8 pb-12 sm:pt-10 sm:pb-16">
      <h1 className="text-[1.75rem] leading-[1.2] font-semibold tracking-[-0.022em] text-zinc-900 sm:text-[2.125rem] dark:text-zinc-100">
        Activity
        {live ? (
          <span className="ml-3 inline-flex items-center gap-1.5 align-middle font-mono text-[0.8125rem] font-normal tracking-[0.08em] text-zinc-500 uppercase dark:text-zinc-400">
            <span
              className="bg-accent-600 dark:bg-accent-300 inline-block h-1.5 w-1.5 rounded-full motion-safe:animate-pulse"
              aria-hidden="true"
            />
            live now
          </span>
        ) : null}
      </h1>
      <p className="max-w-measure mt-4 text-[1.0625rem] leading-[1.75] text-zinc-600 dark:text-zinc-400">
        A public record of visits to this site. No cookies, no IP stored — just country,
        city, and an approximate location.
      </p>
      <div className="mt-12">{children}</div>
    </div>
  );
}
