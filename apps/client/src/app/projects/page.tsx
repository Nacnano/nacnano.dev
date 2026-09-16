import projectsData from "@/data/projectsData";
import { genPageMetaData } from "@/app/seo";
import { PAGE_TITLES } from "@/data/pageTitles";
import CustomLink from "@/components/Link";
import ProjectCard from "./ProjectCard";

export const metadata = genPageMetaData({
  title: PAGE_TITLES.projects,
  description: "Things other people used, and things I just went looking into.",
});

const built = projectsData.filter((p) => p.category === "built");
const research = projectsData.filter((p) => p.category === "research");

const sections = [
  {
    id: "built",
    heading: "Things people used",
    blurb:
      "Sites and apps other people actually used, mostly student-facing — a course planner, freshman-event registrations, a couple of hackathon wins.",
    items: built,
  },
  {
    id: "research",
    heading: "Things I looked into",
    blurb:
      "Coursework and research I did for class and for myself, mostly notebooks rather than websites — a Thai benchmark, a diffusion model for summarisation, chess read straight off video.",
    items: research,
  },
];

export default function Projects() {
  return (
    <div className="py-12 sm:py-16">
      <h1 className="text-[1.75rem] leading-[1.2] font-semibold tracking-[-0.022em] text-zinc-900 sm:text-[2.125rem] dark:text-zinc-100">
        Projects
      </h1>
      <p className="max-w-measure mt-4 text-[1.0625rem] leading-[1.75] text-zinc-600 dark:text-zinc-400">
        Some of these are things other people used. Some are things I just went looking
        into.
      </p>

      <nav aria-label="Project sections" className="mt-6 flex flex-wrap gap-2.5">
        {sections.map((section) => (
          <CustomLink
            key={section.id}
            href={`#${section.id}`}
            className="rounded border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:border-zinc-300 hover:text-zinc-900 dark:border-zinc-800 dark:text-zinc-300 dark:hover:border-zinc-700 dark:hover:text-zinc-100"
          >
            {section.heading}
          </CustomLink>
        ))}
      </nav>

      {sections.map((section) => (
        <section key={section.id} aria-labelledby={section.id} className="mt-14">
          <h2
            id={section.id}
            className="text-base font-semibold tracking-[-0.011em] text-zinc-900 dark:text-zinc-100"
          >
            {section.heading}
          </h2>
          <p className="max-w-measure mt-2 text-[0.9375rem] leading-7 text-zinc-600 dark:text-zinc-400">
            {section.blurb}
          </p>
          <div className="mt-4 divide-y divide-zinc-200 border-t border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
            {section.items.map((project) => (
              <ProjectCard key={project.title} {...project} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
