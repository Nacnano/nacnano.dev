import { genPageMetaData } from "@/app/seo";
import { PAGE_TITLES } from "@/data/pageTitles";
import { isActivityLive } from "@/lib/activity";
import { loadInitialFeed } from "@/lib/activityServer";
import ActivityFeed from "./ActivityFeed";

// The feed reflects live visits, so it is rendered per request rather than
// baked at build. This also means the "show seed or not" decision is made with
// the deployment's runtime environment, so the sample data can never be
// frozen into a Vercel preview or production page. The static heading and intro
// live in ./layout.tsx so they paint before this resolves.
export const dynamic = "force-dynamic";

export const metadata = genPageMetaData({
  title: PAGE_TITLES.activity,
  description:
    "A live feed of visits to nacnano.dev — who has been here, from where, and what they read.",
});

export default async function Activity() {
  const live = isActivityLive();
  const initial = await loadInitialFeed(live);

  if (initial.status === "error") {
    return (
      <p className="max-w-measure text-[1.0625rem] leading-[1.75] text-zinc-600 dark:text-zinc-400">
        The live feed is unavailable right now — that&rsquo;s a problem on my side, not
        yours. Please check back in a moment.
      </p>
    );
  }

  return (
    <ActivityFeed
      initialVisits={initial.payload.visits}
      initialCount={initial.payload.count}
      initialHasMore={initial.payload.hasMore ?? false}
      initialCursor={initial.payload.nextCursor ?? null}
      live={live}
    />
  );
}
