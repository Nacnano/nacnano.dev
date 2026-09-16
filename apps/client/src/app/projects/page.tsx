import projectsData from "@/data/projectsData";
import { genPageMetaData } from "@/app/seo";
import { PAGE_TITLES } from "@/data/pageTitles";
import CustomLink from "@/components/Link";
import ProjectCard from "./ProjectCard";

export const metadata = genPageMetaData({
  title: PAGE_TITLES.projects,
  description: "Things I've helped build, mostly for students.",
});

const built = projectsData.filter((p) => p.category === "built");
const research = projectsData.filter((p) => p.category === "research");

export default function Projects() {
  return (
    <div className="py-12 sm:py-16">
      <h1 className="text-[1.75rem] leading-[1.2] font-semibold tracking-[-0.022em] text-zinc-900 sm:text-[2.125rem] dark:text-zinc-100">
        Projects
      </h1>
      <p className="max-w-measure mt-4 text-[1.0625rem] leading-[1.75] text-zinc-600 dark:text-zinc-400">
        Built with other people, mostly for students. Some still run; some lasted a
        weekend.
      </p>

      <p className="max-w-measure mt-4 text-[1.0625rem] leading-[1.75] text-zinc-600 dark:text-zinc-400">
        Most of these are things other people used. A few are things I just went looking
        into — a diffusion model that summarises Thai, chess moves read straight off
        video, a maths model for arguing about the greatest tennis player of all time.
      </p>

      <nav
        aria-label="Project sections"
        className="mt-6 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm"
      >
        <CustomLink
          href="#built"
          className="hover:text-accent-600 dark:hover:text-accent-300 rounded font-medium text-zinc-500 transition-colors dark:text-zinc-400"
        >
          Things people used
        </CustomLink>
        <span aria-hidden="true" className="text-zinc-300 dark:text-zinc-700">
          ·
        </span>
        <CustomLink
          href="#research"
          className="hover:text-accent-600 dark:hover:text-accent-300 rounded font-medium text-zinc-500 transition-colors dark:text-zinc-400"
        >
          Things I looked into
        </CustomLink>
      </nav>

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
        <p className="max-w-measure mt-2 text-[0.9375rem] leading-7 text-zinc-600 dark:text-zinc-400">
          Coursework and research. Mostly notebooks, not websites.
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
