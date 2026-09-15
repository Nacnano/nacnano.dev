import { STREAM_MAXLEN } from "@/lib/activityRedis";

/**
 * Static chrome for /activity. Living in a layout (not the page) means the
 * heading and intro render immediately and survive the streaming swap — so the
 * loading skeleton only fills the feed slot below and nothing jumps when the
 * data arrives.
 */
export default function ActivityLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="py-12 sm:py-16">
      <h1 className="text-[1.75rem] font-semibold leading-[1.2] tracking-[-0.022em] text-zinc-900 dark:text-zinc-100 sm:text-[2.125rem]">
        Activity
      </h1>
      <p className="mt-4 max-w-measure text-[1.0625rem] leading-[1.75] text-zinc-600 dark:text-zinc-400">
        A public record of visits to this site. No cookies, and no IP address is stored —
        only the country, the city, and a coordinate rounded to roughly ten kilometres or
        less that Vercel derives from each request. We keep the most recent{" "}
        {STREAM_MAXLEN.toLocaleString("en-US")} visits, and anything older than six months
        rolls off.
      </p>
      <div className="mt-12">{children}</div>
    </div>
  );
}
