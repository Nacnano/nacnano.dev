"use client";

import { useState, type ReactNode } from "react";

export default function AnswerDisclosure({
  id,
  preview,
  children,
}: {
  id: string;
  preview: string;
  children: ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mt-2.5">
      <div id={id}>
        {expanded ? (
          <div className="prose max-w-measure dark:prose-invert">{children}</div>
        ) : (
          <p className="max-w-measure text-[0.9375rem] leading-7 text-zinc-600 dark:text-zinc-400">
            {preview}
            <span aria-hidden="true">…</span>
          </p>
        )}
      </div>

      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={id}
        onClick={() => setExpanded((current) => !current)}
        className="mt-3 rounded border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:border-zinc-300 hover:text-zinc-900 dark:border-zinc-800 dark:text-zinc-300 dark:hover:border-zinc-700 dark:hover:text-zinc-100"
      >
        {expanded ? "Show less" : "Read more"}
      </button>
    </div>
  );
}
