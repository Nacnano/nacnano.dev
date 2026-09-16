import Mdx from "@/components/Mdx";
import { genPageMetaData } from "@/app/seo";
import { PAGE_TITLES } from "@/data/pageTitles";
import siteMetadata from "@/data/siteMetadata";
import { formatDate } from "@/lib/formatDate";
import { jsonLdScriptProps } from "@/lib/content";
import { publishedAma, amaStructuredData } from "@/lib/ama";
import { MAX_CONTACT, MAX_QUESTION, RETENTION_DAYS } from "@/lib/amaInbox";
import { ASK_RETRY_AFTER_SECONDS } from "@/lib/rateLimit";
import AskForm from "./AskForm";

export const metadata = genPageMetaData({
  title: PAGE_TITLES.ama,
  description:
    "Questions people have asked Nac, and the answers worth keeping. If yours isn't here, send it over.",
  // Answers land here rarely and without warning, which is exactly what a feed
  // is for. `canonical` is repeated from the root layout because per-page
  // `alternates` replaces it rather than merging into it.
  alternates: {
    canonical: "./",
    types: {
      "application/rss+xml": `${siteMetadata.siteUrl}/ama/rss.xml`,
    },
  },
});

/**
 * A drawn permalink mark. `#` would be a Unicode glyph standing in for an icon,
 * which the Drawn Icon Rule forbids; this is the same stroked-SVG material as
 * every other icon on the site. It sits in a 24px inline target rather than the
 * standalone icon control's 44px one — an inline mark inside a heading's line
 * box cannot be 44px without breaking the line it belongs to.
 */
function PermalinkIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

export default function Ama() {
  const entries = publishedAma();
  const jsonLd = amaStructuredData(entries);

  return (
    <div className="py-12 sm:py-16">
      {/*
        Escaped through the shared helper, exactly as the essay page does — a
        `</script>` inside an authored answer would otherwise close the element
        early, and an answer about web development is precisely where one shows
        up. The content being ours makes this defence in depth, not a live XSS.
      */}
      <script {...jsonLdScriptProps(jsonLd)} />

      <h1 className="text-[1.75rem] leading-[1.2] font-semibold tracking-[-0.022em] text-zinc-900 sm:text-[2.125rem] dark:text-zinc-100">
        Ask me anything
      </h1>
      <p className="max-w-measure mt-4 text-[1.0625rem] leading-[1.75] text-zinc-600 dark:text-zinc-400">
        Anything you like. Most of it gets a short reply and goes no further. The answers
        below are the ones I kept thinking about afterwards.
      </p>

      <AskForm
        maxQuestion={MAX_QUESTION}
        maxContact={MAX_CONTACT}
        retentionDays={RETENTION_DAYS}
        retryAfterMinutes={ASK_RETRY_AFTER_SECONDS / 60}
        email={siteMetadata.email}
      />

      <section className="mt-12">
        <h2 className="text-base font-semibold tracking-[-0.011em] text-zinc-900 dark:text-zinc-100">
          Answered
        </h2>

        {entries.length === 0 ? (
          <p className="mt-4 text-[0.9375rem] leading-7 text-zinc-600 dark:text-zinc-400">
            Nothing yet. Go on then.
          </p>
        ) : (
          <div className="mt-6 divide-y divide-zinc-200 border-t border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
            {entries.map((entry) => (
              <article key={entry.slug} className="py-7">
                <div className="flex flex-col gap-2 sm:flex-row sm:gap-8">
                  <dl className="sm:w-36 sm:shrink-0 sm:pt-1">
                    <dt className="sr-only">Answered</dt>
                    <dd className="font-mono text-xs tracking-[0.08em] text-zinc-500 uppercase dark:text-zinc-400">
                      <time dateTime={entry.date}>
                        {formatDate(entry.date, siteMetadata.locale)}
                      </time>
                    </dd>
                  </dl>

                  <div className="min-w-0">
                    <h3
                      id={entry.slug}
                      className="text-[1.0625rem] leading-7 font-semibold tracking-[-0.011em] text-zinc-900 dark:text-zinc-100"
                    >
                      {entry.question}{" "}
                      <a
                        href={`#${entry.slug}`}
                        // Naming every one of these "Link to this question" gives
                        // a screen reader an unusable list of identical entries.
                        aria-label={`Link to this question: ${entry.question}`}
                        className="hover:text-accent-600 dark:hover:text-accent-300 ml-0.5 inline-flex h-6 w-6 translate-y-1 items-center justify-center rounded text-zinc-500 no-underline transition-colors dark:text-zinc-400"
                      >
                        <PermalinkIcon />
                      </a>
                    </h3>

                    {/*
                    Label, not Meta: "a recruiter" is words, and Meta is mono for
                    figures. Same size and tracking, Inter instead of the mono.
                  */}
                    {entry.askedBy && (
                      <p className="mt-1.5 text-xs tracking-[0.08em] text-zinc-500 uppercase dark:text-zinc-400">
                        &mdash; {entry.askedBy}
                      </p>
                    )}

                    <div className="prose prose-zinc max-w-measure dark:prose-invert mt-2.5">
                      <Mdx source={entry.answer} />
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
