import Mdx from "@/components/Mdx";
import CustomLink from "@/components/Link";
import { genPageMetaData } from "@/app/seo";
import siteMetadata from "@/data/siteMetadata";
import { formatDate } from "@/lib/formatDate";
import { publishedAma, amaStructuredData } from "@/lib/ama";

export const metadata = genPageMetaData({
  title: "Ask me anything",
  description:
    "Questions people have asked Nac, and the answers worth keeping. If yours isn't here, send it over.",
});

export default function Ama() {
  const entries = publishedAma();
  const jsonLd = amaStructuredData(entries);

  return (
    <div className="py-12 sm:py-16">
      <script
        type="application/ld+json"
        // Structured data is generated from authored content above, never from
        // anything a visitor controls, so it is safe to inline verbatim.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <h1 className="text-[1.75rem] font-semibold leading-[1.2] tracking-[-0.022em] text-zinc-900 dark:text-zinc-100 sm:text-[2.125rem]">
        Ask me anything
      </h1>
      <p className="max-w-measure mt-4 text-[1.0625rem] leading-[1.75] text-zinc-600 dark:text-zinc-400">
        Questions come in over email and X. Most get a one-line reply and disappear; the
        ones that turned into something worth reading live here, answered in my own words.
      </p>

      {entries.length === 0 ? (
        <p className="mt-10 text-[0.9375rem] leading-7 text-zinc-600 dark:text-zinc-400">
          Nothing answered yet.{" "}
          <CustomLink
            href={`mailto:${siteMetadata.email}`}
            className="hover:text-accent-600 hover:decoration-accent-600 dark:hover:text-accent-300 dark:hover:decoration-accent-300 rounded text-zinc-900 underline decoration-zinc-300 underline-offset-4 transition-colors dark:text-zinc-100 dark:decoration-zinc-700"
          >
            Be the first to ask
          </CustomLink>
          .
        </p>
      ) : (
        <>
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
                      <CustomLink
                        href={`#${entry.slug}`}
                        aria-label={`Link to this question`}
                        className="hover:text-accent-600 dark:hover:text-accent-300 rounded font-mono text-sm font-normal text-zinc-300 no-underline transition-colors dark:text-zinc-700"
                      >
                        #
                      </CustomLink>
                    </h2>

                    {entry.askedBy && (
                      <p className="mt-1.5 font-mono text-xs uppercase tracking-[0.08em] text-zinc-500 dark:text-zinc-400">
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

          <aside className="mt-10 border-t border-zinc-200 pt-6 dark:border-zinc-800">
            <p className="max-w-measure text-[0.9375rem] leading-7 text-zinc-600 dark:text-zinc-400">
              Yours isn&rsquo;t here? Ask over email and, if it&rsquo;s worth a public
              answer, it might end up on this page.{" "}
              <CustomLink
                href={`mailto:${siteMetadata.email}`}
                className="hover:text-accent-600 hover:decoration-accent-600 dark:hover:text-accent-300 dark:hover:decoration-accent-300 rounded text-zinc-900 underline decoration-zinc-300 underline-offset-4 transition-colors dark:text-zinc-100 dark:decoration-zinc-700"
              >
                {siteMetadata.email}
              </CustomLink>
            </p>
          </aside>
        </>
      )}
    </div>
  );
}
