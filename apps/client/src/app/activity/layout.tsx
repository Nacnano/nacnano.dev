import CustomLink from "@/components/Link";
import { CITY_VISIBILITY_THRESHOLD } from "@/lib/activity";
import { RETENTION_DAYS, STREAM_MAXLEN } from "@/lib/activityRedis";

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
        A public record of visits to this site. No cookies, and no IP address is stored —
        only the country, and a coordinate rounded to roughly ten kilometres or less that
        Vercel derives from each request. A city name shows only when at least{" "}
        {CITY_VISIBILITY_THRESHOLD} visits share it, so one person&rsquo;s trip to a small
        town is never published; everything else degrades to the country. We keep the most
        recent {STREAM_MAXLEN.toLocaleString("en-US")} visits, and anything older than{" "}
        {RETENTION_DAYS} days rolls off. How this works is spelled out on the{" "}
        <CustomLink
          href="/privacy"
          className="hover:text-accent-600 dark:hover:text-accent-300 rounded underline decoration-zinc-300 underline-offset-4 transition-colors dark:decoration-zinc-700"
        >
          privacy
        </CustomLink>{" "}
        page.
      </p>
      <div className="mt-12">{children}</div>
    </div>
  );
}
