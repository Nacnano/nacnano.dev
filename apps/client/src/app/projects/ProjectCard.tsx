import Image from "@/components/Image";
import CustomLink from "@/components/Link";

interface Props {
  title: string;
  description: string;
  imgSrc: string;
  href?: string;
  stack?: string[];
}

const ProjectCard = ({ title, description, imgSrc, href, stack }: Props) => (
  <article className="group relative flex flex-col gap-4 py-7 sm:flex-row sm:gap-7">
    {imgSrc && (
      <div className="shrink-0 self-start overflow-hidden rounded border border-zinc-200 sm:w-44 dark:border-zinc-800">
        <Image
          src={imgSrc}
          alt=""
          aria-hidden="true"
          width={352}
          height={198}
          sizes="(min-width: 640px) 176px, 100vw"
          // The crop belongs on the image, not on the anchor around it.
          className="h-40 w-full bg-zinc-50 object-contain sm:h-24 dark:bg-zinc-900"
        />
      </div>
    )}
    <div className="min-w-0">
      <h3 className="text-[1.0625rem] font-semibold leading-7 tracking-[-0.011em] text-zinc-900 transition-colors group-hover:text-accent-600 dark:text-zinc-100 dark:group-hover:text-accent-300">
        {href ? (
          <CustomLink href={href} className="rounded">
            <span className="absolute inset-0" aria-hidden="true" />
            {title}
          </CustomLink>
        ) : (
          title
        )}
      </h3>
      <p className="mt-1.5 max-w-measure text-[0.9375rem] leading-7 text-zinc-600 dark:text-zinc-400">
        {description}
      </p>
      {stack && stack.length > 0 && (
        <ul className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1">
          {stack.map((tech) => (
            <li
              key={tech}
              className="text-xs uppercase tracking-[0.08em] text-zinc-500 dark:text-zinc-400"
            >
              {tech}
            </li>
          ))}
        </ul>
      )}
    </div>
  </article>
);

export default ProjectCard;
