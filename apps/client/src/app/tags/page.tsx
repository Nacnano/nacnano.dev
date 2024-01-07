import Tag from "@/components/Tag";
import { genPageMetaData } from "../seo";

import tagData from "app/tag-data.json";
import CustomLink from "@/components/Link";
import { slug } from "github-slugger";

export const metadata = genPageMetaData({
  title: "Tags",
  description: "Tags I wrote about",
});

export default function Page() {
  const tagCount = tagData as Record<string, number>;
  const tagKeys = tagCount ? Object.keys(tagCount) : [];
  const sortedTags = tagKeys.sort((a, b) => tagCount[b] - tagCount[a]);
  return (
    <>
      <div className="flex flex-col items-start justify-start divide-y divide-gray-200 dark:divide-gray-700 md:mt-24 md:flex-row md:items-center md:justify-center md:space-x-6 md:divide-y-0">
        <div className="space-x-2 pb-8 pt-6 md:space-y-5">
          <h1 className="text-3xl font-extrabold leading-9 tracking-tight text-gray-900 dark:text-gray-100 sm:text-4xl sm:leading-10 md:border-r-2 md:px-6 md:text-6xl md:leading-14">
            Tags
          </h1>
        </div>
        <div className="flex flex-wrap max-w-lg">
          {!tagKeys.length && "No Tag found."}
          {sortedTags.map((tag) => {
            return (
              <div key={tag} className="mb-2 mr-5 mt-2">
                <Tag text={tag} />
                <CustomLink
                  href={`/tags/${slug(tag)}`}
                  className="-ml-2 text-sm font-semibold uppercase text-gray-600 dark:text-gray-300"
                  aria-label={`View Blogs tagged ${tag}`}
                >{` (${tagCount[tag]})`}</CustomLink>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
