import CustomLink from "@/components/Link";
import ScrollTop from "@/components/ScrollTop";
import Tag from "@/components/Tag";
import siteMetadata from "@/data/siteMetadata";
import type { Author, Blog } from "@/lib/content";
import type { ReactNode } from "react";

const postDateTemplate: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "long",
  day: "numeric",
};

/**
 * A stroked-SVG arrow, drawn from the same material as every other icon here
 * (the Drawn Icon Rule forbids a Unicode glyph standing in for one). Decorative:
 * the link's accessible name already comes from the label and title.
 */
function DirectionArrow({ dir }: { dir: "left" | "right" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {dir === "right" ? (
        <>
          <path d="M4 12h15" />
          <path d="m13 6 6 6-6 6" />
        </>
      ) : (
        <>
          <path d="M20 12H5" />
          <path d="m11 6-6 6 6 6" />
        </>
      )}
    </svg>
  );
}

interface Props {
  content: Blog;
  authors: Author[];
  newer?: { path: string; title: string };
  older?: { path: string; title: string };
  children: ReactNode;
}

export default function BlogWithDetail({ content, newer, older, children }: Props) {
  const { date, title, tags, readingTime } = content;
  const showOlder = Boolean(older?.path);
  const showNewer = Boolean(newer?.path);

  return (
    <>
      <ScrollTop />
      <article className="py-12 sm:py-16">
        <header className="max-w-measure">
          <h1 className="text-[1.75rem] leading-[1.2] font-semibold tracking-[-0.022em] text-zinc-900 sm:text-[2.125rem] dark:text-zinc-100">
            {title}
          </h1>
          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs tracking-[0.08em] text-zinc-500 uppercase dark:text-zinc-400">
            <time dateTime={date}>
              {new Date(date).toLocaleDateString(siteMetadata.locale, postDateTemplate)}
            </time>
            <span aria-hidden="true">·</span>
            <span>{readingTime.text}</span>
          </div>
          {tags?.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
              {tags.map((tag) => (
                <Tag key={tag} text={tag} />
              ))}
            </ul>
          )}
        </header>

        <div className="prose max-w-measure dark:prose-invert mt-10">{children}</div>

        {/*
          One bordered band for everything that follows the essay — prev/next
          then the author note — separated by a single hairline. Prev/next is a
          two-column split (older left, newer right): each arrow rides with its
          own title instead of being stranded at the far edge, and the columns
          meet at one divider instead of a stack of full-width rules.
        */}
        <div className="mt-12 divide-y divide-zinc-200 border-t border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
          {(showOlder || showNewer) && (
            <nav aria-label="More essays" className="grid grid-cols-1 sm:grid-cols-2">
              {showOlder && (
                <CustomLink
                  href={`/${older!.path}`}
                  rel="prev"
                  className={`group flex items-center gap-4 py-5 sm:gap-3 sm:pr-8 ${
                    showNewer
                      ? "border-b border-zinc-200 sm:border-r sm:border-b-0 dark:border-zinc-800"
                      : ""
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className="group-hover:text-accent-600 dark:group-hover:text-accent-300 shrink-0 text-zinc-500 transition group-hover:-translate-x-0.5 dark:text-zinc-400"
                  >
                    <DirectionArrow dir="left" />
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="text-xs tracking-[0.08em] text-zinc-500 uppercase dark:text-zinc-400">
                      Older
                    </span>
                    <span className="group-hover:text-accent-600 dark:group-hover:text-accent-300 mt-1 text-[0.9375rem] leading-6 font-medium text-zinc-900 transition-colors dark:text-zinc-100">
                      {older!.title}
                    </span>
                  </span>
                </CustomLink>
              )}
              {showNewer && (
                <CustomLink
                  href={`/${newer!.path}`}
                  rel="next"
                  className="group flex items-center justify-end gap-4 py-5 text-right sm:gap-3 sm:pl-8"
                >
                  <span className="flex min-w-0 flex-col items-end">
                    <span className="text-xs tracking-[0.08em] text-zinc-500 uppercase dark:text-zinc-400">
                      Newer
                    </span>
                    <span className="group-hover:text-accent-600 dark:group-hover:text-accent-300 mt-1 text-[0.9375rem] leading-6 font-medium text-zinc-900 transition-colors dark:text-zinc-100">
                      {newer!.title}
                    </span>
                  </span>
                  <span
                    aria-hidden="true"
                    className="group-hover:text-accent-600 dark:group-hover:text-accent-300 shrink-0 text-zinc-500 transition group-hover:translate-x-0.5 dark:text-zinc-400"
                  >
                    <DirectionArrow dir="right" />
                  </span>
                </CustomLink>
              )}
            </nav>
          )}

          {/* A stranger arriving from social meets the author after the essay,
              not between the headline and the first sentence. */}
          <aside className="py-6">
            <p className="max-w-measure text-[0.9375rem] leading-7 text-zinc-600 dark:text-zinc-400">
              Written by{" "}
              <span className="font-medium text-zinc-900 dark:text-zinc-100">
                {siteMetadata.author}
              </span>
              . {siteMetadata.description}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <CustomLink
                href="/"
                className="rounded border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:border-zinc-300 hover:text-zinc-900 dark:border-zinc-800 dark:text-zinc-300 dark:hover:border-zinc-700 dark:hover:text-zinc-100"
              >
                More writing
              </CustomLink>
              <CustomLink
                href="/about"
                className="rounded border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:border-zinc-300 hover:text-zinc-900 dark:border-zinc-800 dark:text-zinc-300 dark:hover:border-zinc-700 dark:hover:text-zinc-100"
              >
                About me
              </CustomLink>
              {/* A reader who just finished an essay is the likeliest person to
                  have a question about it, so the AMA sits beside the other
                  next-step links rather than hidden in the nav. */}
              <CustomLink
                href="/ama"
                className="rounded border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:border-zinc-300 hover:text-zinc-900 dark:border-zinc-800 dark:text-zinc-300 dark:hover:border-zinc-700 dark:hover:text-zinc-100"
              >
                Ask me about this
              </CustomLink>
            </div>
          </aside>
        </div>
      </article>
    </>
  );
}
