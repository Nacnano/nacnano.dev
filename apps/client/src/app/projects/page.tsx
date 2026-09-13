import projectsData from "@/data/projectsData";
import { genPageMetaData } from "@/app/seo";
import ProjectCard from "./ProjectCard";

export const metadata = genPageMetaData({
  title: "Projects",
  description:
    "A few things Nac has built — student tools, an open-source course planner, and a research project or two.",
});

export default function Projects() {
  return (
    <div className="py-12 sm:py-16">
      <h1 className="text-[1.75rem] font-semibold leading-[1.2] tracking-[-0.022em] text-zinc-900 sm:text-[2.125rem] dark:text-zinc-100">
        Things I&rsquo;ve made
      </h1>
      <p className="mt-4 max-w-measure text-[1.0625rem] leading-[1.75] text-zinc-600 dark:text-zinc-400">
        Mostly built with other people, mostly for students. A few are still
        running.
      </p>

      <div className="mt-8 divide-y divide-zinc-200 border-t border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
        {projectsData.map((project) => (
          <ProjectCard key={project.title} {...project} />
        ))}
      </div>
    </div>
  );
}
