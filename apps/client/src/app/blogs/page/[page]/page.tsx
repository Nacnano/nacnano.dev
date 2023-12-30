import ListLayout from "@/layouts/ListLayout";
import { allBlogs } from "contentlayer/generated";
import { allCoreContent, sortPosts } from "pliny/utils/contentlayer";

const BLOGS_PER_PAGE = 5;

export const generateStaticParams = async () => {
  const totalPages = Math.ceil(allBlogs.length / BLOGS_PER_PAGE);
  const paths = Array.from({ length: totalPages }, (_, i) => ({
    page: (i + 1).toString(),
  }));

  return paths;
};

export default function Page({ params }: { params: { page: string } }) {
  const blogs = allCoreContent(sortPosts(allBlogs));
  const pageNumber = parseInt(params.page);
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
      <ListLayout
        blogs={blogs}
        title="All Blogs"
        pagination={pagination}
        initialDisplayBlogs={initialDisplayBlogs}
      />
    </>
  );
}
