import siteMetadata from "@/data/siteMetadata";
import CustomLink from "@/components/Link";
import BlogCard from "@/components/BlogCard";
import { CoreContent } from "pliny/utils/contentlayer";
import { Blog } from "contentlayer/generated";

const primaryLinks = [
  { href: siteMetadata.resume, title: "Résumé" },
  { href: "/projects", title: "Projects" },
  { href: siteMetadata.github, title: "GitHub" },
];

const Main = ({ posts }: { posts: CoreContent<Blog>[] }) => {
  const latest = posts[0];

  return (
    <>
      <section className="py-14 sm:py-20">
        <h1 className="text-[2rem] font-semibold leading-[1.15] tracking-[-0.022em] text-zinc-900 sm:text-[2.75rem] dark:text-zinc-100">
          {siteMetadata.author}
        </h1>

        <p className="mt-3 flex items-center gap-2.5 font-mono text-xs uppercase tracking-[0.08em] text-zinc-600 dark:text-zinc-400">
          <span
            className="h-1.5 w-1.5 rounded-full bg-accent-600 dark:bg-accent-300"
            aria-hidden="true"
          />
          {siteMetadata.status}
        </p>

        <p className="mt-6 max-w-measure text-[1.0625rem] leading-[1.75] text-zinc-600 dark:text-zinc-400">
          {siteMetadata.description}
        </p>

        <nav aria-label="Primary" className="mt-7 flex flex-wrap gap-2">
          {primaryLinks.map((link, i) => (
            <CustomLink
              key={link.title}
              href={link.href}
              className={
                i === 0
                  ? "rounded border border-transparent bg-zinc-900 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
                  : "rounded border border-zinc-200 px-3.5 py-2 text-sm font-medium text-zinc-700 transition-colors hover:border-zinc-300 hover:text-zinc-900 dark:border-zinc-800 dark:text-zinc-300 dark:hover:border-zinc-700 dark:hover:text-zinc-100"
              }
            >
              {link.title}
            </CustomLink>
          ))}
        </nav>
      </section>

      <section
        aria-labelledby="writing"
        className="border-t border-zinc-200 pt-10 dark:border-zinc-800"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
          <h2
            id="writing"
            className="text-base font-semibold tracking-[-0.011em] text-zinc-900 dark:text-zinc-100"
          >
            Writing
          </h2>
          {latest && (
            <p className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
              {posts.length} {posts.length === 1 ? "essay" : "essays"}
            </p>
          )}
        </div>

        {/* Honest about cadence rather than implying a live feed. */}
        <p className="mt-2 max-w-measure text-[0.9375rem] leading-7 text-zinc-600 dark:text-zinc-400">
          I write occasionally — usually when something goes wrong and I want to
          understand why. Everything here is personal rather than technical.
        </p>

        <div className="mt-4 divide-y divide-zinc-200 dark:divide-zinc-800">
          {posts.length === 0 ? (
            <p className="py-7 text-[0.9375rem] text-zinc-600 dark:text-zinc-400">
              Nothing published yet.
            </p>
          ) : (
            posts.map((post) => <BlogCard key={post.slug} post={post} />)
          )}
        </div>
      </section>
    </>
  );
};

export default Main;
