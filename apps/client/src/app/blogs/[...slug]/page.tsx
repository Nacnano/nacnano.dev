import "@/styles/prism.css";

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
import siteMetadata from "@/data/siteMetadata";

const defaultLayout = "BlogWithDetail";
const layouts = { BlogSimple, BlogWithDetail, BlogWithBanner };

export async function generateMetadata({
  params,
}: {
  params: { slug: string[] };
}) {
  const slug = decodeURI(params.slug.join("/"));
  const blog = allBlogs.find((b) => b.slug === slug);
  if (!blog) return;

  const authorList = blog.authors || ["default"];
  const authorDetails = authorList.map((author) => {
    const authorResults = allAuthors.find((p) => p.slug === author);
    return coreContent(authorResults as Authors);
  });

  const publishedAt = new Date(blog.date).toISOString();
  const modifiedAt = new Date(blog.lastmod || blog.date).toISOString();
  const authors = authorDetails.map((author) => author.name);
  let imageList = [siteMetadata.socialBanner];
  if (blog.images) {
    imageList = typeof blog.images === "string" ? [blog.images] : blog.images;
  }
  const ogImages = imageList.map((image) => {
    return {
      url: image.includes("http") ? image : siteMetadata.siteUrl + image,
    };
  });

  return {
    title: blog.title,
    description: blog.summary,
    openGraph: {
      title: blog.title,
      description: blog.summary,
      siteName: siteMetadata.title,
      locale: "en_US",
      type: "article",
      publishedTime: publishedAt,
      modifiedTime: modifiedAt,
      url: "./",
      images: ogImages,
      authors: authors.length > 0 ? authors : [siteMetadata.author],
    },
    twitter: {
      card: "summary_large_image",
      title: blog.title,
      description: blog.summary,
      images: imageList,
    },
  };
}

export const generateStaticParams = () => {
  const paths = allBlogs.map((p) => ({ slug: p.slug.split("/") }));

  return paths;
};

export default async function Page({ params }: { params: { slug: string[] } }) {
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

  const jsonLd = blog.structuredData;

  jsonLd["author"] = authorDetails.map((author) => {
    return { "@type": "Person", name: author.name };
  });

  const Layout = layouts[blog?.layout || defaultLayout];
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
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
    </>
  );
}
