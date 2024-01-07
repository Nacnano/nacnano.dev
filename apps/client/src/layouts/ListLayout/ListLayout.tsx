"use client";

import CustomLink from "@/components/Link";
import Tag from "@/components/Tag";
import siteMetadata from "@/data/siteMetadata";
import { Blog } from "contentlayer/generated";
import { CoreContent } from "pliny/utils/contentlayer";
import { formatDate } from "pliny/utils/formatDate";
import { useState } from "react";
import Pagination from "./Pagination";
import { usePathname } from "next/navigation";
import tagData from "@/app/tag-data.json";
import { slug } from "github-slugger";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
}
interface Props {
  blogs: CoreContent<Blog>[];
  title: string;
  initialDisplayBlogs?: CoreContent<Blog>[];
  pagination?: PaginationProps;
}

export default function ListLayout({
  blogs,
  title,
  initialDisplayBlogs = [],
  pagination,
}: Props) {
  const [searchValue, setSearchValue] = useState("");

  const pathname = usePathname();
  const tagCounts = tagData as Record<string, number>;
  const tagKeys = Object.keys(tagCounts);
  const sortedTags = tagKeys.sort((a, b) => tagCounts[b] - tagCounts[a]);

  let filteredBlogs = blogs.filter((blog) => {
    const searchContent = blog.title + blog.summary + blog.tags?.join(" ");
    return searchContent.toLowerCase().includes(searchValue.toLowerCase());
  });

  const displayBlogs =
    initialDisplayBlogs.length > 0 && !searchValue
      ? initialDisplayBlogs
      : filteredBlogs;

  return (
    <>
      <div className="divide-y divide-grey-200 dark:divide-gray-700">
        <div className="space-y-2 pb-8 pt-6 md:space-y-5">
          <h1 className="text-3xl font-extrabold leading-9 tracking-tight text-gray-900 dark:text-gray-100 sm:text-4xl sm:leading-10 md:text-6xl md:leading-14">
            {title}
          </h1>
          <div className="relative max-w-lg">
            <label>
              <span className="sr-only"></span>
              <input
                aria-label="Search Blogs"
                type="text"
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder="Search blogs"
                className="block w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-900 dark:bg-gray-800 dark:text-gray-100"
              />
            </label>
            <svg
              className="absolute right-3 top-3 h-5 w-5 text-gray-400 dark:text-gray-300"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>
        <div className="px-6 py-4">
          {pathname.split("/")[1] === "blogs" ? (
            <h3 className="font-bold uppercase text-primary-500">All Tags</h3>
          ) : (
            <CustomLink
              href={`/blogs`}
              className="font-bold uppercase text-gray-700 hover:text-primary-500 dark:text-gray-300 dark:hover:text-primary-500"
            >
              All Tags
            </CustomLink>
          )}
          <ul className="flex flex-wrap">
            {sortedTags.map((t) => {
              return (
                <li key={t} className="my-3">
                  {pathname.split("/tags/")[1] === slug(t) ? (
                    <h3 className="inline px-3 py-2 text-sm font-bold uppercase text-primary-500">
                      {`${t} (${tagCounts[t]})`}
                    </h3>
                  ) : (
                    <CustomLink
                      href={`/tags/${slug(t)}`}
                      className="px-3 py-2 text-sm font-medium uppercase text-gray-500 hover:text-primary-500 dark:text-gray-300 dark:hover:text-primary-500"
                      aria-label={`View posts tagged ${t}`}
                    >
                      {`${t} (${tagCounts[t]})`}
                    </CustomLink>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
        <ul>
          {!displayBlogs.length && (
            <div className="  py-4 text-2xl font-medium leading-8 tracking-tight">
              No blog found.
            </div>
          )}
          {displayBlogs.map((blog) => {
            const { path, date, title, summary, tags } = blog;

            return (
              <li key={path} className="py-4">
                <article className="space-y-2 xl:grid xl:grid-cols-4 xl:items-baseline xl:space-y-0">
                  <dl>
                    <dt className="sr-only"> Published on </dt>
                    <dd className="text-base font-medium leading-6 text-gray-500 dark:text-gray-400">
                      <time dateTime={date}>
                        {formatDate(date, siteMetadata.locale)}
                      </time>
                    </dd>
                  </dl>
                  <div className="space-y-3 xl:col-span-3">
                    <div>
                      <h3 className="text-2xl font-bold leading-8 tracking-tight">
                        <CustomLink
                          href={`/${path}`}
                          className="text-gray-900 dark:text-gray-100"
                        >
                          {title}
                        </CustomLink>
                      </h3>
                      <div className="flex flex-wrap">
                        {tags?.map((tag) => <Tag key={tag} text={tag} />)}
                      </div>
                    </div>
                    <div className="prose max-w-none text-gray-500 dark:text-gray-400">
                      {summary}
                    </div>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      </div>
      {pagination && pagination.totalPages > 1 && !searchValue && (
        <Pagination
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
        />
      )}
    </>
  );
}
