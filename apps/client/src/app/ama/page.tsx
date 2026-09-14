import Mdx from "@/components/Mdx";
import { genPageMetaData } from "@/app/seo";
import siteMetadata from "@/data/siteMetadata";
import { formatDate } from "@/lib/formatDate";
import { jsonLdScriptProps } from "@/lib/content";
import { publishedAma, amaStructuredData } from "@/lib/ama";
import { MAX_CONTACT, MAX_QUESTION, RETENTION_DAYS } from "@/lib/amaInbox";
import { ASK_RETRY_AFTER_SECONDS } from "@/lib/rateLimit";
import AskForm from "./AskForm";

export const metadata = genPageMetaData({
  title: "Ask me anything",
  description:
    "Questions people have asked Nac, and the answers worth keeping. If yours isn't here, send it over.",
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

      <h1 className="text-[1.75rem] font-semibold leading-[1.2] tracking-[-0.022em] text-zinc-900 dark:text-zinc-100 sm:text-[2.125rem]">
        Ask me anything
      </h1>
      <p className="max-w-measure mt-4 text-[1.0625rem] leading-[1.75] text-zinc-600 dark:text-zinc-400">
        Questions come in over the box at the bottom of this page, and over email. Most
        get a one-line reply and disappear; the ones that turned into something worth
        reading live here, answered in my own words.
      </p>

      {entries.length === 0 ? (
        <p className="mt-10 text-[0.9375rem] leading-7 text-zinc-600 dark:text-zinc-400">
          Nothing answered yet. Be the first to ask.
        </p>
      ) : (
        <div className="mt-10 divide-y divide-zinc-200 border-t border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
          {entries.map((entry) => (
            <article key={entry.slug} className="py-7">
              <div className="flex flex-col gap-2 sm:flex-row sm:gap-8">
                <dl className="sm:w-36 sm:shrink-0 sm:pt-1">
                  <dt className="sr-only">Answered</dt>
                  <dd className="font-mono text-xs uppercase tracking-[0.08em] text-zinc-500 dark:text-zinc-400">
                    <time dateTime={entry.date}>
                      {formatDate(entry.date, siteMetadata.locale)}
                    </time>
                  </dd>
                </dl>

                <div className="min-w-0">
                  <h2
                    id={entry.slug}
                    className="text-[1.0625rem] font-semibold leading-7 tracking-[-0.011em] text-zinc-900 dark:text-zinc-100"
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
                  </h2>

                  {/*
                    Label, not Meta: "a recruiter" is words, and Meta is mono for
                    figures. Same size and tracking, Inter instead of the mono.
                  */}
                  {entry.askedBy && (
                    <p className="mt-1.5 text-xs uppercase tracking-[0.08em] text-zinc-500 dark:text-zinc-400">
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

      <AskForm
        maxQuestion={MAX_QUESTION}
        maxContact={MAX_CONTACT}
        retentionDays={RETENTION_DAYS}
        retryAfterMinutes={ASK_RETRY_AFTER_SECONDS / 60}
        email={siteMetadata.email}
      />
    </div>
  );
}
