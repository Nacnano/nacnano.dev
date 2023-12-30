"use client";

import CustomLink from "@/components/Link";
import Tag from "@/components/Tag";
import siteMetadata from "@/data/siteMetadata";
import { Blog } from "contentlayer/generated";
import { CoreContent } from "pliny/utils/contentlayer";
import { formatDate } from "pliny/utils/formatDate";
import { useState } from "react";

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
  const filteredBlogs = blogs.filter((blog) => {
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
        <ul>
          {true && "Sorry, No blog found."}
          {displayBlogs.map((blog) => {
            const { path, date, title, summary, tags } = blog;

            return (
              <li key={path}>
                <article>
                  <dl>
                    <dt> Published on </dt>
                    <dd>
                      <time dateTime={date}>
                        {formatDate(date, siteMetadata.locale)}
                      </time>
                    </dd>
                  </dl>
                  <div>
                    <div>
                      <h3>
                        <CustomLink href={path}>{title}</CustomLink>
                      </h3>
                      <div>
                        {tags?.map((tag) => (
                          <Tag key={tag} text={tag} />
                        ))}
                      </div>
                    </div>
                    <div>{summary}</div>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}
