import { allCoreContent, sortPosts } from "pliny/utils/contentlayer";
import { genPageMetaData } from "../seo";
import { allBlogs } from "contentlayer/generated";
import ListLayout from "@/layouts/ListLayout/ListLayout";

const BLOGS_PER_PAGE = 5;

export const metadata = genPageMetaData({ title: "Blogs" });

export default function Blogs() {
  const blogs = allCoreContent(sortPosts(allBlogs));
  const pageNumber = 1;
  const initialDisplayBlogs = blogs.slice(
    BLOGS_PER_PAGE * (pageNumber - 1),
    BLOGS_PER_PAGE * pageNumber
  );

  const pagination = {
    currentPage: pageNumber,
    totalPages: Math.ceil(blogs.length / BLOGS_PER_PAGE),
  };
  return (
    <>
      <ListLayout blogs={blogs} title="All Blogs" />
    </>
  );
}
