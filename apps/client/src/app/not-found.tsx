import CustomLink from "@/components/Link";
import siteMetadata from "@/data/siteMetadata";

export default function NotFound() {
  return (
    <div className="py-24 sm:py-32">
      <h1 className="text-[1.75rem] leading-[1.2] font-semibold tracking-[-0.022em] text-zinc-900 sm:text-[2.125rem] dark:text-zinc-100">
        Nothing here
      </h1>
      <p className="max-w-measure mt-4 text-[1.0625rem] leading-[1.75] text-zinc-600 dark:text-zinc-400">
        Either the link is stale or I moved something and forgot to leave a note. If you
        were after something in particular, just ask me.
      </p>
      <div className="mt-7 flex flex-wrap gap-2">
        <CustomLink
          href="/"
          className="pressable rounded bg-zinc-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          Back to the writing
        </CustomLink>
        <CustomLink
          href={`mailto:${siteMetadata.email}`}
          className="pressable rounded border border-zinc-200 px-3.5 py-2 text-sm font-medium text-zinc-700 hover:border-zinc-300 hover:text-zinc-900 dark:border-zinc-800 dark:text-zinc-300 dark:hover:border-zinc-700 dark:hover:text-zinc-100"
        >
          Email me
        </CustomLink>
      </div>
    </div>
  );
}
