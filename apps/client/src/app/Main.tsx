import siteMetadata from "@/data/siteMetadata";
import CustomLink from "@/components/Link";
import StatusLine from "@/components/StatusLine";
import BlogCard from "@/components/BlogCard";
import Image from "next/image";
import type { Blog } from "@/lib/content";

const Main = ({ posts }: { posts: Blog[] }) => (
  <>
    <section className="animate-rise py-14 sm:py-20">
      <div className="flex items-center gap-4">
        {/* The photo does the introducing; the type can stay quiet. */}
        <Image
          src="/static/images/oong-oong-cropped.jpg"
          alt=""
          aria-hidden="true"
          width={64}
          height={64}
          priority
          className="h-16 w-16 shrink-0 rounded-full object-cover transition-transform duration-300 ease-out hover:scale-105 hover:-rotate-6 motion-reduce:transition-none motion-reduce:hover:scale-100 motion-reduce:hover:rotate-0"
        />
        <div className="min-w-0">
          <h1 className="text-[1.75rem] leading-[1.2] font-semibold tracking-[-0.022em] text-zinc-900 sm:text-[2.125rem] dark:text-zinc-100">
            {siteMetadata.greeting}
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {siteMetadata.legalName}
          </p>
          <StatusLine />
        </div>
      </div>

      <p className="max-w-measure mt-6 text-[1.0625rem] leading-[1.75] text-zinc-600 dark:text-zinc-400">
        {siteMetadata.description}
      </p>

      {/* One solid action — the CV, the one thing the recruiter came for — and
          one outline action beside it. The rest already live in the header nav. */}
      <div className="mt-7 flex flex-wrap items-center gap-2">
        <CustomLink
          href={siteMetadata.resume}
          className="rounded bg-zinc-900 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          Résumé
        </CustomLink>
        <CustomLink
          href="/about"
          className="rounded border border-zinc-200 px-3.5 py-2 text-sm font-medium text-zinc-700 transition-colors hover:border-zinc-300 hover:text-zinc-900 dark:border-zinc-800 dark:text-zinc-300 dark:hover:border-zinc-700 dark:hover:text-zinc-100"
        >
          More about me
        </CustomLink>
      </div>
    </section>

    <section
      aria-labelledby="writing"
      className="border-t border-zinc-200 pt-10 dark:border-zinc-800"
    >
      <h2
        id="writing"
        className="text-base font-semibold tracking-[-0.011em] text-zinc-900 dark:text-zinc-100"
      >
        Writing
      </h2>

      <p className="max-w-measure mt-2 text-[0.9375rem] leading-7 text-zinc-600 dark:text-zinc-400">
        Mostly things that went sideways and what I made of them afterwards. I write when
        something is bothering me, so: not often.
      </p>

      <div className="mt-4 divide-y divide-zinc-200 dark:divide-zinc-800">
        {posts.length === 0 ? (
          <p className="py-7 text-[0.9375rem] text-zinc-600 dark:text-zinc-400">
            Nothing here yet. Give me a minute.
          </p>
        ) : (
          posts.map((post) => <BlogCard key={post.slug} post={post} />)
        )}
      </div>
    </section>
  </>
);

export default Main;
