"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Records a site visit on every page view, in real time.
 *
 * Lives in the root layout so a visit is captured no matter which page a
 * reader enters or navigates to — not only when they happen to open /activity.
 * The path (not query strings) is the signal that matters for the globe, and
 * sticking to it keeps the component free of the useSearchParams Suspense
 * constraint. `live` comes from the server layout, so the beacon never fires
 * on a static deploy where there is nowhere to write.
 */
export default function VisitTracker({ live }: { live: boolean }) {
  const pathname = usePathname();
  const last = useRef<string>("");

  useEffect(() => {
    if (!live || !pathname) return;
    // Guard against the same path firing twice (React StrictMode runs the
    // effect twice in development; a re-render must not double-count).
    if (last.current === pathname) return;
    last.current = pathname;

    void fetch("/api/activity/visit", {
      method: "POST",
      headers: { "content-type": "application/json" },
      // The page title is the friendlier label for the page path.
      body: JSON.stringify({ path: pathname, title: document.title }),
      keepalive: true,
    }).catch(() => {
      // Tracking must never surface as a page error.
    });
  }, [live, pathname]);

  return null;
}
