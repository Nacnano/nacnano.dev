import Image from "next/image";
import CustomLink from "@/components/Link";
import ProjectMark from "./ProjectMark";
import type { Project } from "@/data/projectsData";

const ProjectCard = ({
  title,
  description,
  imgSrc,
  mark,
  href,
  repo,
  stack,
  note,
}: Project) => {
  // The title goes to the live site when there is one, otherwise to the
  // source. "Source" only appears separately when both exist.
  const primary = href ?? repo;
  const showSource = Boolean(href && repo);

  return (
    <article className="group relative flex flex-col gap-4 py-7 sm:flex-row sm:gap-7">
      <div className="shrink-0 self-start overflow-hidden rounded border border-zinc-200 sm:w-44 dark:border-zinc-800">
        {imgSrc ? (
          <Image
            src={imgSrc}
            alt=""
            aria-hidden="true"
            width={352}
            height={198}
            sizes="(min-width: 640px) 176px, 100vw"
            className="h-40 w-full bg-zinc-50 object-contain sm:h-24 dark:bg-zinc-900"
          />
        ) : (
          <ProjectMark kind={mark ?? "grid"} />
        )}
      </div>

      <div className="min-w-0">
        <h3 className="group-hover:text-accent-600 dark:group-hover:text-accent-300 text-[1.0625rem] leading-7 font-semibold tracking-[-0.011em] text-zinc-900 transition-colors dark:text-zinc-100">
          {primary ? (
            <CustomLink href={primary} className="rounded">
              {/* Stretched link: the whole row is the target, with one
                  accessible name and no nested anchors. */}
              <span className="absolute inset-0" aria-hidden="true" />
              {title}
            </CustomLink>
          ) : (
            title
          )}
        </h3>

        <p className="max-w-measure mt-1.5 text-[0.9375rem] leading-7 text-zinc-600 dark:text-zinc-400">
          {description}
        </p>

        {note && (
          <p className="max-w-measure mt-1.5 text-[0.9375rem] leading-7 text-zinc-500 dark:text-zinc-400">
            {note}
          </p>
        )}

        {stack.length > 0 && (
          <ul className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1">
            {stack.map((tech) => (
              <li
                key={tech}
                className="text-xs tracking-[0.08em] text-zinc-500 uppercase dark:text-zinc-400"
              >
                {tech}
              </li>
            ))}
          </ul>
        )}

        {showSource && (
          // `relative` lifts this above the stretched row overlay so it stays
          // clickable rather than being swallowed by the title's hit area.
          <CustomLink
            href={repo as string}
            className="hover:text-accent-600 hover:decoration-accent-600 dark:hover:text-accent-300 dark:hover:decoration-accent-300 relative mt-2.5 inline-block rounded text-sm text-zinc-500 underline decoration-zinc-300 underline-offset-4 transition-colors dark:text-zinc-400 dark:decoration-zinc-700"
          >
            Source
          </CustomLink>
        )}
      </div>
    </article>
  );
};

export default ProjectCard;
