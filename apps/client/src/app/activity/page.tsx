import { genPageMetaData } from "@/app/seo";
import {
  buildFeedPayload,
  isActivityLive,
  shouldUseSeed,
} from "@/lib/activity";
import { readActivityFeed } from "@/lib/activityRedis";
import { seedVisits } from "@/data/activityData";
import ActivityFeed from "./ActivityFeed";

// The feed reflects live visits, so it is rendered per request rather than
// baked at build. This also means the "show seed or not" decision is made with
// the deployment's runtime environment, so the sample data can never be
// frozen into a Vercel preview or production page.
export const dynamic = "force-dynamic";

export const metadata = genPageMetaData({
  title: "Activity",
  description:
    "A live feed of visits to nacnano.dev — who has been here, from where, and what they read.",
});

async function getInitialFeed(live: boolean) {
  // Live: read the real store up front so the first paint is genuine, not the
  // sample. A failed read is an honest empty feed, never a fabricated one.
  if (live) {
    try {
      return await readActivityFeed();
    } catch {
      return { visits: [], count: 0 };
    }
  }
  // Store-less local dev still gets the sample; any Vercel deploy (where this
  // runs without Redis configured) shows the empty state instead.
  if (shouldUseSeed()) {
    return buildFeedPayload(seedVisits, seedVisits.length);
  }
  return { visits: [], count: 0 };
}

export default async function Activity() {
  const live = isActivityLive();
  const { visits, count } = await getInitialFeed(live);

  return (
    <div className="py-12 sm:py-16">
      <h1 className="text-[1.75rem] font-semibold leading-[1.2] tracking-[-0.022em] text-zinc-900 sm:text-[2.125rem] dark:text-zinc-100">
        Activity
      </h1>
      <p className="mt-4 max-w-measure text-[1.0625rem] leading-[1.75] text-zinc-600 dark:text-zinc-400">
        A public record of people visiting this site. No cookies, no personal
        data — just roughly where in the world each visit came from.
      </p>

      <div className="mt-12">
        <ActivityFeed
          initialVisits={visits}
          initialCount={count}
          live={live}
        />
      </div>
    </div>
  );
}
