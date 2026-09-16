import type React from "react";
import type { Author } from "@/lib/content";
import Image from "next/image";
import SocialIcon from "@/components/social-icons";
import CustomLink from "@/components/Link";
import StatusLine from "@/components/StatusLine";
import siteMetadata from "@/data/siteMetadata";
import Timeline from "./Timeline";
import { workItems, educationItems } from "@/data/timelineData";

interface Props {
  children: React.ReactNode;
  content: Author;
}

export default function AuthorLayout({ children, content }: Props) {
  const { name, avatar } = content;

  return (
    <div className="py-12 sm:py-16">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-7">
        {avatar && (
          <Image
            src={avatar}
            alt=""
            aria-hidden="true"
            width={80}
            height={80}
            className="h-20 w-20 shrink-0 rounded-full object-cover transition-transform duration-300 ease-out hover:scale-105 hover:-rotate-6 motion-reduce:transition-none motion-reduce:hover:scale-100 motion-reduce:hover:rotate-0"
          />
        )}
        <div className="min-w-0">
          <h1 className="text-[1.75rem] leading-[1.2] font-semibold tracking-[-0.022em] text-zinc-900 sm:text-[2.125rem] dark:text-zinc-100">
            {name}
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {siteMetadata.legalName} · goes by Nac
          </p>
          <StatusLine />
        </div>
      </header>

      <div className="prose max-w-measure dark:prose-invert mt-9">{children}</div>

      {/* A hairline aside, not a card — the system uses rules for this. */}
      <p className="max-w-measure mt-8 border-l border-zinc-300 pl-4 text-[0.9375rem] leading-7 text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
        {siteMetadata.now}
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
        <div className="flex items-center gap-4">
          <SocialIcon kind="github" href={siteMetadata.github} />
          <SocialIcon kind="linkedin" href={siteMetadata.linkedin} />
          <SocialIcon kind="mail" href={`mailto:${siteMetadata.email}`} />
        </div>
        <CustomLink
          href={siteMetadata.resume}
          className="hover:text-accent-600 hover:decoration-accent-600 dark:hover:text-accent-300 dark:hover:decoration-accent-300 rounded text-sm text-zinc-500 underline decoration-zinc-300 underline-offset-4 transition-colors dark:text-zinc-400 dark:decoration-zinc-700"
        >
          The formal version, if you need it
        </CustomLink>
      </div>

      <section
        aria-labelledby="work"
        className="mt-14 border-t border-zinc-200 pt-8 dark:border-zinc-800"
      >
        <h2
          id="work"
          className="mb-2 text-base font-semibold tracking-[-0.011em] text-zinc-900 dark:text-zinc-100"
        >
          Things I&rsquo;ve done
        </h2>
        <Timeline items={workItems} initialCount={4} moreLabel="older ones" />
      </section>

      <section
        aria-labelledby="school"
        className="mt-14 border-t border-zinc-200 pt-8 dark:border-zinc-800"
      >
        <h2
          id="school"
          className="mb-2 text-base font-semibold tracking-[-0.011em] text-zinc-900 dark:text-zinc-100"
        >
          School
        </h2>
        <Timeline items={educationItems} />
      </section>
    </div>
  );
}
