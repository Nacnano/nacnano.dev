import projectsData from "@/data/projectsData";
import { genPageMetaData } from "@/app/seo";
import { PAGE_TITLES } from "@/data/pageTitles";
import ProjectCard from "./ProjectCard";

export const metadata = genPageMetaData({
  title: PAGE_TITLES.projects,
  description:
    "A few things Nac has built — student tools, an open-source course planner, and a handful of research projects.",
});

const built = projectsData.filter((p) => p.category === "built");
const research = projectsData.filter((p) => p.category === "research");

export default function Projects() {
  return (
    <div className="py-12 sm:py-16">
      <h1 className="text-[1.75rem] font-semibold leading-[1.2] tracking-[-0.022em] text-zinc-900 dark:text-zinc-100 sm:text-[2.125rem]">
        Things I&rsquo;ve made
      </h1>
      <p className="mt-4 max-w-measure text-[1.0625rem] leading-[1.75] text-zinc-600 dark:text-zinc-400">
        Mostly built with other people, mostly for students. Some of it is still running,
        some of it was only ever meant to last a weekend.
      </p>

      <section aria-labelledby="built" className="mt-12">
        <h2
          id="built"
          className="text-base font-semibold tracking-[-0.011em] text-zinc-900 dark:text-zinc-100"
        >
          Things people used
        </h2>
        <div className="mt-2 divide-y divide-zinc-200 border-t border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
          {built.map((project) => (
            <ProjectCard key={project.title} {...project} />
          ))}
        </div>
      </section>

      <section aria-labelledby="research" className="mt-14">
        <h2
          id="research"
          className="text-base font-semibold tracking-[-0.011em] text-zinc-900 dark:text-zinc-100"
        >
          Things I looked into
        </h2>
        <p className="mt-2 max-w-measure text-[0.9375rem] leading-7 text-zinc-600 dark:text-zinc-400">
          Coursework and research. Most of this lives in a notebook somewhere rather than
          on the internet.
        </p>
        <div className="mt-4 divide-y divide-zinc-200 border-t border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
          {research.map((project) => (
            <ProjectCard key={project.title} {...project} />
          ))}
        </div>
      </section>
    </div>
  );
}
