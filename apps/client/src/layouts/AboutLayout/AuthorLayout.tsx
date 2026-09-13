import React from "react";
import { Authors } from "contentlayer/generated";
import Image from "@/components/Image";
import SocialIcon from "@/components/social-icons";
import CustomLink from "@/components/Link";
import siteMetadata from "@/data/siteMetadata";
import Timeline from "./Timeline";
import { workItems, educationItems } from "@/data/timelineData";

interface Props {
  children: React.ReactNode;
  content: Omit<Authors, "_id" | "_raw" | "body">;
}

export default function AuthorLayout({ children, content }: Props) {
  const { name, avatar } = content;

  return (
    <div className="py-12 sm:py-16">
      <header className="flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-8">
        {avatar && (
          <Image
            src={avatar}
            alt=""
            aria-hidden="true"
            width={96}
            height={96}
            className="h-24 w-24 shrink-0 rounded-full object-cover"
          />
        )}
        <div className="min-w-0">
          <h1 className="text-[1.75rem] font-semibold leading-[1.2] tracking-[-0.022em] text-zinc-900 sm:text-[2.125rem] dark:text-zinc-100">
            {name}
          </h1>
          <p className="mt-2 flex items-center gap-2.5 font-mono text-xs uppercase tracking-[0.08em] text-zinc-600 dark:text-zinc-400">
            <span
              className="h-1.5 w-1.5 rounded-full bg-accent-600 dark:bg-accent-300"
              aria-hidden="true"
            />
            {siteMetadata.status}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <CustomLink
              href={siteMetadata.resume}
              className="rounded bg-zinc-900 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              Full résumé
            </CustomLink>
            <div className="ml-1 flex items-center gap-4">
              <SocialIcon kind="github" href={siteMetadata.github} />
              <SocialIcon kind="linkedin" href={siteMetadata.linkedin} />
              <SocialIcon kind="mail" href={`mailto:${siteMetadata.email}`} />
            </div>
          </div>
        </div>
      </header>

      <div className="prose prose-zinc mt-10 max-w-measure dark:prose-invert">
        {children}
      </div>

      <section
        aria-labelledby="work"
        className="mt-14 border-t border-zinc-200 pt-8 dark:border-zinc-800"
      >
        <h2
          id="work"
          className="mb-2 text-base font-semibold tracking-[-0.011em] text-zinc-900 dark:text-zinc-100"
        >
          Work
        </h2>
        <Timeline items={workItems} initialCount={5} moreLabel="earlier roles" />
      </section>

      <section
        aria-labelledby="education"
        className="mt-14 border-t border-zinc-200 pt-8 dark:border-zinc-800"
      >
        <h2
          id="education"
          className="mb-2 text-base font-semibold tracking-[-0.011em] text-zinc-900 dark:text-zinc-100"
        >
          Education
        </h2>
        <Timeline items={educationItems} />
      </section>
    </div>
  );
}
