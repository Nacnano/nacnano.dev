import { Authors, Blog, allAuthors, allBlogs } from "contentlayer/generated";
import { notFound } from "next/navigation";
import {
  allCoreContent,
  coreContent,
  sortPosts,
} from "pliny/utils/contentlayer";

import {
  BlogSimple,
  BlogWithBanner,
  BlogWithDetail,
} from "@/layouts/BlogLayout";
import { MDXLayoutRenderer } from "pliny/mdx-components";
import { components } from "@/components/MDXComponents";

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

  const blog = allBlogs.find((blog) => blog.slug === slug) as Blog;
  const mainContent = coreContent(blog);

  const prev = blogs[blogIndex - 1];
  const next = blogs[blogIndex + 1];

  const authors = blog?.authors || ["default"];
  const authorDetails = authors.map((author) => {
    const authorDetail = allAuthors.find((a) => a.slug === author);
    return coreContent(authorDetail as Authors);
  });

  const jsonLD = blog.structuredData;

  jsonLD["author"] = authorDetails.map((author) => {
    return { "@type": "Person", name: author.name };
  });
  const Layout = layouts[blog?.layout || defaultLayout];
  return (
    <>
      {
        <Layout
          content={mainContent}
          authors={authorDetails}
          next={next}
          prev={prev}
        >
          <MDXLayoutRenderer
            code={blog.body.code}
            components={components}
            toc={blog.toc}
          />
        </Layout>
      }
    </>
  );
}
