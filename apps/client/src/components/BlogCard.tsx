import { formatDate } from "@/lib/formatDate";
import CustomLink from "./Link";
import siteMetadata from "@/data/siteMetadata";
import type { Blog } from "@/lib/content";

export default function BlogCard({ post }: { post: Blog }) {
  const { slug, date, title, summary, readingTime } = post;

  return (
    <article className="group relative py-7">
      <div className="flex flex-col gap-2 sm:flex-row sm:gap-8">
        <dl className="sm:w-36 sm:shrink-0 sm:pt-1">
          <dt className="sr-only">Published</dt>
          <dd className="font-mono text-xs uppercase tracking-[0.08em] text-zinc-500 dark:text-zinc-400">
            <time dateTime={date}>{formatDate(date, siteMetadata.locale)}</time>
          </dd>
        </dl>

        <div className="min-w-0">
          <h3 className="text-[1.0625rem] font-semibold leading-7 tracking-[-0.011em] text-zinc-900 transition-colors group-hover:text-accent-600 dark:text-zinc-100 dark:group-hover:text-accent-300">
            <CustomLink href={`/blogs/${slug}`} className="rounded">
              {/* Stretched link: the whole row is the target, with one
                  accessible name and no nested anchors. */}
              <span className="absolute inset-0" aria-hidden="true" />
              {title}
            </CustomLink>
          </h3>
          <p className="mt-1.5 text-[0.9375rem] leading-7 text-zinc-600 dark:text-zinc-400">
            {summary}
          </p>
          <p className="mt-2 font-mono text-xs text-zinc-500 dark:text-zinc-400">
            {readingTime.text}
          </p>
        </div>
      </div>
    </article>
  );
}
