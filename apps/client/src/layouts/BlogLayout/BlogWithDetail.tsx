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
          rows then the author note — each separated by a single hairline. The
          old version gave the nav a top and bottom rule and then the aside its
          own top rule, which left an empty strip pinned between two lines that
          read as a broken, content-less row.
        */}
        <div className="mt-12 divide-y divide-zinc-200 border-t border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
          {(newer || older) && (
            <nav
              aria-label="More essays"
              className="divide-y divide-zinc-200 dark:divide-zinc-800"
            >
              {[
                { post: older, label: "Older", rel: "prev", dir: "left" },
                { post: newer, label: "Newer", rel: "next", dir: "right" },
              ]
                .filter((row) => row.post?.path)
                .map(({ post, label, rel, dir }) => (
                  <CustomLink
                    key={rel}
                    href={`/${post!.path}`}
                    rel={rel}
                    className="group flex flex-col gap-1 py-4 sm:flex-row sm:items-baseline sm:gap-6"
                  >
                    <span className="w-14 shrink-0 text-xs tracking-[0.08em] text-zinc-500 uppercase dark:text-zinc-400">
                      {label}
                    </span>
                    <span className="group-hover:text-accent-600 dark:group-hover:text-accent-300 min-w-0 flex-1 text-[0.9375rem] leading-6 font-medium text-zinc-900 transition-colors dark:text-zinc-100">
                      {post!.title}
                    </span>
                    {/* A drawn arrow fills the empty right-hand column and makes
                        the reading direction legible at a glance, instead of
                        leaning on the muted label alone. */}
                    <span
                      aria-hidden="true"
                      className={`hidden shrink-0 self-center text-zinc-500 transition group-hover:text-accent-600 sm:inline-flex dark:text-zinc-400 dark:group-hover:text-accent-300 ${
                        dir === "right" ? "group-hover:translate-x-0.5" : "group-hover:-translate-x-0.5"
                      }`}
                    >
                      <DirectionArrow dir={dir as "left" | "right"} />
                    </span>
                  </CustomLink>
                ))}
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
