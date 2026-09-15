import { genPageMetaData } from "@/app/seo";
import CustomLink from "@/components/Link";
import siteMetadata from "@/data/siteMetadata";
import { PAGE_TITLES } from "@/data/pageTitles";
import { CITY_VISIBILITY_THRESHOLD } from "@/lib/activity";
import { RETENTION_DAYS as AMA_RETENTION_DAYS } from "@/lib/amaInbox";
import { RETENTION_DAYS, STREAM_MAXLEN } from "@/lib/activityRedis";

/**
 * The stated privacy policy. It is deliberately plain prose on a prerendered
 * page — no components, no data fetching, nothing that could drift from the code
 * it describes beyond the numbers, which are imported from the modules that
 * enforce them (the retention windows, the k-anonymity threshold, the stream
 * cap) so this page cannot advertise a promise the store isn't keeping.
 */
export const metadata = genPageMetaData({
  title: PAGE_TITLES.privacy,
  description:
    "What nacnano.dev records about a visit, what it publishes, how long it keeps it, and how to ask for a removal.",
});

export default function Privacy() {
  return (
    <div className="py-12 sm:py-16">
      <h1 className="text-[1.75rem] leading-[1.2] font-semibold tracking-[-0.022em] text-zinc-900 sm:text-[2.125rem] dark:text-zinc-100">
        Privacy
      </h1>

      <p className="max-w-measure mt-4 text-[1.0625rem] leading-[1.75] text-zinc-600 dark:text-zinc-400">
        This site is run by one person, not a company, and it is built to collect as
        little as it can while still showing an honest public record of who has read what.
        There are no third-party analytics, no advertising scripts, and no cookies. The
        whole thing runs on a single first-party backend. Here is exactly what that
        backend knows.
      </p>

      <section className="mt-10">
        <h2 className="text-base font-semibold tracking-[-0.011em] text-zinc-900 dark:text-zinc-100">
          What a visit records
        </h2>
        <p className="max-w-measure mt-3 text-[1.0625rem] leading-[1.75] text-zinc-600 dark:text-zinc-400">
          When you view a page, the site stores the path you read and a title, plus a
          coarse location that the hosting platform derives from your request: a country,
          a city, and a latitude/longitude rounded to roughly ten kilometres. The{" "}
          <em className="font-medium text-zinc-900 not-italic dark:text-zinc-100">
            raw IP address is never stored
          </em>{" "}
          — it is hashed with a private salt solely to count requests against rate limits,
          which is a one-way digest no one can turn back into an address.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-base font-semibold tracking-[-0.011em] text-zinc-900 dark:text-zinc-100">
          What the public feed shows
        </h2>
        <p className="max-w-measure mt-3 text-[1.0625rem] leading-[1.75] text-zinc-600 dark:text-zinc-400">
          The{" "}
          <CustomLink
            href="/activity"
            className="hover:text-accent-600 dark:hover:text-accent-300 rounded underline decoration-zinc-300 underline-offset-4 transition-colors dark:decoration-zinc-700"
          >
            activity page
          </CustomLink>{" "}
          publishes a city name only when at least {CITY_VISIBILITY_THRESHOLD} visits in
          the recent window share it; a single visitor from a small town is shown at
          country level instead, never by name. Exact coordinates are never sent to your
          browser at all — the globe is drawn from locations aggregated on the server, so
          no one can read a precise position out of the page.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-base font-semibold tracking-[-0.011em] text-zinc-900 dark:text-zinc-100">
          How long it is kept
        </h2>
        <p className="max-w-measure mt-3 text-[1.0625rem] leading-[1.75] text-zinc-600 dark:text-zinc-400">
          Visit records are bounded two ways: the {STREAM_MAXLEN.toLocaleString("en-US")}{" "}
          most recent are kept, and anything older than {RETENTION_DAYS} days rolls off
          automatically whether or not the site stays live. Anything you submit through
          the{" "}
          <CustomLink
            href="/ama"
            className="hover:text-accent-600 dark:hover:text-accent-300 rounded underline decoration-zinc-300 underline-offset-4 transition-colors dark:decoration-zinc-700"
          >
            ask box
          </CustomLink>{" "}
          &mdash; including any contact detail you choose to volunteer &mdash; is held in
          a private inbox for {AMA_RETENTION_DAYS} days and is never read back by any
          page. Only questions I decide to answer are copied, by hand, into the public
          answers.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-base font-semibold tracking-[-0.011em] text-zinc-900 dark:text-zinc-100">
          Getting something removed
        </h2>
        <p className="max-w-measure mt-3 text-[1.0625rem] leading-[1.75] text-zinc-600 dark:text-zinc-400">
          The retention above is automatic and needs no request of you. But if you would
          rather a specific visit or an ask of yours were gone now rather than later, or
          you simply have a question about any of this, email{" "}
          <CustomLink
            href={`mailto:${siteMetadata.email}`}
            className="hover:text-accent-600 dark:hover:text-accent-300 rounded underline decoration-zinc-300 underline-offset-4 transition-colors dark:decoration-zinc-700"
          >
            {siteMetadata.email}
          </CustomLink>{" "}
          and I will handle it.
        </p>
      </section>
    </div>
  );
}
