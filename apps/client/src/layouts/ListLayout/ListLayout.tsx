"use client";

import { Blog } from "contentlayer/generated";
import { CoreContent } from "pliny/utils/contentlayer";
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
  initialDisplayBlogs,
  pagination,
}: Props) {
  const [searchValue, setSearchValue] = useState("");

  return (
    <>
      <div>
        <div>
          <h1> {title}</h1>
          <div>
            <label>
              <span className="sr-only"></span>
              <input
                aria-label="Search Blogs"
                type="text"
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder="Search articles"
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
      </div>
    </>
  );
}
