import "@/styles/prism.css";

import { notFound } from "next/navigation";

import { BlogWithDetail } from "@/layouts/BlogLayout";
import Mdx from "@/components/Mdx";
import siteMetadata from "@/data/siteMetadata";
import { getAdjacentPosts } from "@/lib/posts";
import {
  blogStructuredData,
  getAuthor,
  getBlog,
  jsonLdScriptProps,
  publishedBlogs,
  type Author,
} from "@/lib/content";
import type { LayoutName } from "@/lib/blogLayouts";

// The component map is keyed by the same `LayoutName` the content loader
// validates against, so the registry holds itself to the PR's own rule: add a
// name to `LAYOUT_NAMES` without a component here (or vice-versa) is a compile
// error, not a "keep in sync" comment.
const layouts: Record<LayoutName, typeof BlogWithDetail> = { BlogWithDetail };

const defaultLayout: LayoutName = "BlogWithDetail";

/** Frontmatter `layout` is free-form text, so it is narrowed before use. */
const resolveLayout = (name: string | undefined) =>
  name && name in layouts ? layouts[name as LayoutName] : layouts[defaultLayout];

function authorsFor(slugs: string[] | undefined): Author[] {
  return (slugs ?? ["default"])
    .map(getAuthor)
    .filter((author): author is Author => Boolean(author));
}

/** Next 16 passes route params as a Promise. */
type RouteParams = { params: Promise<{ slug: string[] }> };

export async function generateMetadata({ params }: RouteParams) {
  const { slug: segments } = await params;
  const blog = getBlog(decodeURI(segments.join("/")));
  if (!blog) return {};

  const authors = authorsFor(blog.authors).map((author) => author.name);
  const imageList = blog.images?.length ? blog.images : [siteMetadata.socialBanner];
  const ogImages = imageList.map((image) => ({
    url: image.startsWith("http") ? image : siteMetadata.siteUrl + image,
  }));

  return {
    title: blog.title,
    description: blog.summary,
    openGraph: {
      title: blog.title,
      description: blog.summary,
      siteName: siteMetadata.title,
      locale: "en_US",
      type: "article" as const,
      publishedTime: blog.date,
      modifiedTime: blog.lastmod ?? blog.date,
      url: "./",
      images: ogImages,
      authors: authors.length > 0 ? authors : [siteMetadata.author],
    },
    twitter: {
      card: "summary_large_image" as const,
      title: blog.title,
      description: blog.summary,
      images: imageList,
    },
  };
}

export function generateStaticParams() {
  // Drafts are excluded so they are not reachable by URL in production.
  return publishedBlogs().map((blog) => ({ slug: blog.slug.split("/") }));
}

export const dynamicParams = false;

export default async function Page({ params }: RouteParams) {
  const { slug: segments } = await params;
  const slug = decodeURI(segments.join("/"));

  // Drafts are previewable in development but never reachable in production.
  const post = getBlog(slug);
  if (!post || (process.env.NODE_ENV === "production" && post.draft)) {
    notFound();
  }

  const { newer, older } = getAdjacentPosts(publishedBlogs(), slug);
  const authors = authorsFor(post.authors);
  const jsonLd = blogStructuredData(
    post,
    authors.map((author) => author.name)
  );

  const Layout = resolveLayout(post.layout);

  return (
    <>
      <script {...jsonLdScriptProps(jsonLd)} />
      {/*
        `resolveLayout` returns one of a fixed, module-level map — it does not
        create a component during render, so the "created during render" rule is
        a false positive here. The layout registry is resolved per request.
      */}
      {/* eslint-disable-next-line react-hooks/static-components */}
      <Layout content={post} authors={authors} newer={newer} older={older}>
        <Mdx source={post.body} />
      </Layout>
    </>
  );
}
