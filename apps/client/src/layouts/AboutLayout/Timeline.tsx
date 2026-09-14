"use client";

import { useState } from "react";
import type { TimelineItem } from "@/data/timelineData";

interface TimelineProps {
  items: TimelineItem[];
  /** Entries beyond this count collapse behind a disclosure. */
  initialCount?: number;
  moreLabel?: string;
}

const Entry = ({ item }: { item: TimelineItem }) => (
  <li className="relative py-5 pl-7 sm:pl-8">
    {/* The marker pins to the first line rather than floating to the middle
        of a seven-line entry. */}
    <span
      className="absolute left-0 top-[1.55rem] h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-zinc-300 dark:bg-zinc-700"
      aria-hidden="true"
    />
    <p className="font-mono text-xs uppercase tracking-[0.08em] text-zinc-500 dark:text-zinc-400">
      {item.period}
    </p>
    <h3 className="mt-1.5 text-[0.9375rem] font-semibold leading-6 tracking-[-0.011em] text-zinc-900 dark:text-zinc-100">
      {item.title}
    </h3>
    <p className="text-[0.9375rem] leading-6 text-zinc-700 dark:text-zinc-300">
      {item.organisation}
      {item.location && (
        <span className="text-zinc-500 dark:text-zinc-400">
          {" · "}
          {item.location}
        </span>
      )}
    </p>
    {item.description && (
      <p className="max-w-measure mt-2 text-[0.9375rem] leading-7 text-zinc-600 dark:text-zinc-400">
        {item.description}
      </p>
    )}
  </li>
);

const Timeline = ({
  items,
  initialCount = items.length,
  moreLabel = "earlier roles",
}: TimelineProps) => {
  const [expanded, setExpanded] = useState(false);
  const hidden = items.length - initialCount;
  const visible = expanded ? items : items.slice(0, initialCount);

  return (
    <div>
      {/* The rail spans the entries only, never the disclosure below them.
          It sits beside the list rather than inside it, so <ul> keeps only
          <li> children. */}
      <div className="relative">
        <span
          className="absolute bottom-0 left-[2.5px] top-0 w-px bg-zinc-200 dark:bg-zinc-800"
          aria-hidden="true"
        />
        <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {visible.map((item) => (
            <Entry key={`${item.organisation}-${item.period}`} item={item} />
          ))}
        </ul>
      </div>
      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="ml-7 mt-4 rounded border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:border-zinc-300 hover:text-zinc-900 dark:border-zinc-800 dark:text-zinc-300 dark:hover:border-zinc-700 dark:hover:text-zinc-100 sm:ml-8"
        >
          {expanded ? "Show fewer" : `Show ${hidden} ${moreLabel}`}
        </button>
      )}
    </div>
  );
};

export default Timeline;
