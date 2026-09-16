"use client";

import Link from "next/link";
import { scrollToTop } from "@/lib/scrollToTop";

// Behaves like the scroll-to-top control: clicking "Activity" glides the page
// back up. On any other route the link still navigates to /activity (which
// lands at the top); on /activity itself the link is a no-op for the router, so
// this scroll is what returns the reader to the globe and stats.
export default function ActivityFooterLink() {
  return (
    <Link
      href="/activity"
      onClick={() => scrollToTop()}
      className="hover:text-accent-600 hover:decoration-accent-600 dark:hover:text-accent-300 dark:hover:decoration-accent-300 rounded underline decoration-zinc-300 underline-offset-4 transition-colors dark:decoration-zinc-700"
    >
      Activity
    </Link>
  );
}
