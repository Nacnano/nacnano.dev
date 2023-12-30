import { allBlogs } from "contentlayer/generated";
import { notFound } from "next/navigation";
import { allCoreContent, sortPosts } from "pliny/utils/contentlayer";

export const generateStaticParams = () => {
  const paths = allBlogs.map((p) => ({ slug: p.slug.split("/") }));

  return paths;
};

export default function Page({ params }: { params: { slug: string[] } }) {
  const slug = decodeURI(params.slug.join("/"));

  const blogs = allCoreContent(sortPosts(allBlogs));
  const blogIndex = blogs.findIndex((blog) => blog.slug === slug);
  if (blogIndex === -1) return notFound();

  return <></>;
}
