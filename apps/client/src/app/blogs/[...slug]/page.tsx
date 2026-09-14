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
  publishedBlogs,
  type Author,
} from "@/lib/content";

const layouts = { BlogWithDetail } as const;
type LayoutName = keyof typeof layouts;

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
  // Escaping `<` prevents a `</script>` sequence in a title/summary from closing
  // the tag early and injecting markup. The content is ours, so this is defence
  // in depth rather than a live XSS, but a stray `<` would otherwise break the
  // page. The JSON is otherwise unchanged (the client parses `\u003c` back).
  const jsonLdHtml = JSON.stringify(jsonLd).replace(/</g, "\\u003c");

  const Layout = resolveLayout(post.layout);

  return (
    <>
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD built from authored front matter, never visitor input.
        dangerouslySetInnerHTML={{ __html: jsonLdHtml }}
      />
      {/*
        `resolveLayout` returns one of a fixed, module-level map — it does not
        create a component during render, despite reading like it does. The
        layout registry is resolved per request.
      */}
      <Layout content={post} authors={authors} newer={newer} older={older}>
        <Mdx source={post.body} />
      </Layout>
    </>
  );
}
