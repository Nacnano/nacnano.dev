import { allBlogs } from "contentlayer/generated";
import { notFound } from "next/navigation";
import { allCoreContent, sortPosts } from "pliny/utils/contentlayer";

import {
  BlogSimple,
  BlogWithBanner,
  BlogWithDetail,
} from "@/layouts/BlogLayout";

const defaultLayout = "BlogWithDetail";
const layouts = { BlogSimple, BlogWithDetail, BlogWithBanner };

export const generateStaticParams = () => {
  const paths = allBlogs.map((p) => ({ slug: p.slug.split("/") }));

  return paths;
};

export default function Page({ params }: { params: { slug: string[] } }) {
  const slug = decodeURI(params.slug.join("/"));

  const blogs = allCoreContent(sortPosts(allBlogs));
  const blogIndex = blogs.findIndex((blog) => blog.slug === slug);
  if (blogIndex === -1) return notFound();

  // TEMP POST
  const post = {} as any;
  const Layout = layouts[post?.layout || defaultLayout];
  return (
    <>
      <Layout></Layout>
    </>
  );
}
