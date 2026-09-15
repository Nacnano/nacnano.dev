import links from "./links.json";
import CustomLink from "@/components/Link";
import { genPageMetaData } from "@/app/seo";
import { PAGE_TITLES } from "@/data/pageTitles";

export const metadata = genPageMetaData({
  title: PAGE_TITLES.link,
  description: "Shared links and files.",
  robots: { index: false, follow: false },
});

export default function Page() {
  const entries = Object.entries(links ?? {});

  return (
    <div className="py-12 sm:py-16">
      <h1 className="text-[1.75rem] font-semibold leading-[1.2] tracking-[-0.022em] text-zinc-900 dark:text-zinc-100 sm:text-[2.125rem]">
        Links
      </h1>
      {entries.length === 0 ? (
        <p className="mt-4 text-[0.9375rem] text-zinc-600 dark:text-zinc-400">
          Nothing shared right now.
        </p>
      ) : (
        <ul className="mt-8 divide-y divide-zinc-200 border-t border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
          {entries.map(([key, link]) => (
            <li key={key}>
              <CustomLink
                href={link as string}
                className="flex items-center justify-between gap-4 py-4 text-[0.9375rem] font-medium text-zinc-900 transition-colors hover:text-accent-600 dark:text-zinc-100 dark:hover:text-accent-300"
              >
                {key}
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-3.5 w-3.5 shrink-0 text-zinc-400 dark:text-zinc-500"
                  aria-hidden="true"
                >
                  <path d="M7 17 17 7M9 7h8v8" />
                </svg>
              </CustomLink>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
