"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Records a site visit on every page view, in real time.
 *
 * Lives in the root layout so a visit is captured no matter which page a
 * reader enters or navigates to — not only when they open /activity. It always
 * beacons and lets the server decide: `/api/activity/visit` writes when a store
 * is configured and harmlessly no-ops otherwise. Doing it this way (rather than
 * gating on a build-time flag) means production keeps capturing visits even if
 * the Redis credentials are only present in the runtime environment, not the
 * build.
 *
 * Path-only — no query strings — which keeps the component clear of the
 * useSearchParams Suspense constraint, and it is de-duped per path so a
 * re-render cannot double-count.
 */
export default function VisitTracker() {
  const pathname = usePathname();
  const last = useRef<string>("");

  useEffect(() => {
    if (!pathname || last.current === pathname) return;
    last.current = pathname;

    void fetch("/api/activity/visit", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ path: pathname, title: document.title }),
      keepalive: true,
    }).catch(() => {
      // Tracking must never surface as a page error.
    });
  }, [pathname]);

  return null;
}
