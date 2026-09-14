import { genPageMetaData } from "@/app/seo";
import { buildFeedPayload, isActivityLive } from "@/lib/activity";
import { seedActivityEvents } from "@/data/activityData";
import ActivityFeed from "./ActivityFeed";

export const metadata = genPageMetaData({
  title: "Activity",
  description:
    "A live feed of likes, visits, and other things happening on nacnano.dev.",
});

export default function Activity() {
  const { events, count } = buildFeedPayload(
    seedActivityEvents,
    seedActivityEvents.length
  );

  return (
    <div className="py-12 sm:py-16">
      <h1 className="text-[1.75rem] font-semibold leading-[1.2] tracking-[-0.022em] text-zinc-900 sm:text-[2.125rem] dark:text-zinc-100">
        Activity
      </h1>
      <p className="mt-4 max-w-measure text-[1.0625rem] leading-[1.75] text-zinc-600 dark:text-zinc-400">
        A small, honest record of what this corner of the internet has been up
        to. The globe spins wherever people have shown up.
      </p>

      <div className="mt-12">
        <ActivityFeed
          initialEvents={events}
          initialCount={count}
          live={isActivityLive()}
        />
      </div>
    </div>
  );
}
