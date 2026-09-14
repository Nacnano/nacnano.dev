import { readFileSync, readdirSync } from "fs";
import path from "path";
import matter from "gray-matter";
import readingTime from "reading-time";
import siteMetadata from "@/data/siteMetadata";
import { postUrl } from "@/lib/feed";
import { publishedOnly, sortByDateDesc } from "@/lib/posts";

/**
 * Reads MDX content off disk at build time.
 *
 * This replaces contentlayer, whose last release was June 2023. It pinned
 * esbuild, emitted `assert { type: 'json' }` that current Node cannot parse,
 * and its `next-contentlayer` peer range (`^12 || ^13`) blocked every Next
 * upgrade — including the one that carries the security fixes.
 *
 * The shape below is deliberately the same one the routes already consumed,
 * so the migration is a swap rather than a rewrite.
 */

const CONTENT_ROOT = path.join(process.cwd(), "src/data");

export type ReadingTime = {
  text: string;
  minutes: number;
  time: number;
  words: number;
};

export type Blog = {
  /** Filename without extension, e.g. `teaching-failure`. */
  slug: string;
  /** Route path without a leading slash, e.g. `blogs/teaching-failure`. */
  path: string;
  /** Path relative to src/data, used to build the "edit on GitHub" link. */
  filePath: string;
  title: string;
  date: string;
  lastmod?: string;
  summary?: string;
  tags: string[];
  draft?: boolean;
  images?: string[];
  authors?: string[];
  layout?: string;
  readingTime: ReadingTime;
  /** Raw MDX body, compiled by the route. */
  body: string;
};

export type Author = {
  slug: string;
  name: string;
  avatar?: string;
  occupation?: string;
  company?: string;
  email?: string;
  twitter?: string;
  linkedin?: string;
  github?: string;
  facebook?: string;
  youtube?: string;
  body: string;
};

function readMdxDir(dir: string): { file: string; raw: string }[] {
  const full = path.join(CONTENT_ROOT, dir);
  return readdirSync(full)
    .filter((file) => file.endsWith(".mdx"))
    .map((file) => ({
      file,
      raw: readFileSync(path.join(full, file), "utf8"),
    }));
}

function toBlog({ file, raw }: { file: string; raw: string }): Blog {
  const { data, content } = matter(raw);
  const slug = file.replace(/\.mdx$/, "");

  if (!data.title || !data.date) {
    throw new Error(`blogs/${file} is missing required frontmatter (title, date)`);
  }

  return {
    slug,
    path: `blogs/${slug}`,
    filePath: `blogs/${file}`,
    title: String(data.title),
    // Frontmatter dates parse to Date objects; normalise to ISO strings so
    // every consumer gets one type.
    date: new Date(data.date).toISOString(),
    lastmod: data.lastmod ? new Date(data.lastmod).toISOString() : undefined,
    summary: data.summary ? String(data.summary) : undefined,
    tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
    draft: data.draft === true,
    images: Array.isArray(data.images) ? data.images.map(String) : undefined,
    authors: Array.isArray(data.authors) ? data.authors.map(String) : undefined,
    layout: data.layout ? String(data.layout) : undefined,
    readingTime: readingTime(content),
    body: content,
  };
}

function toAuthor({ file, raw }: { file: string; raw: string }): Author {
  const { data, content } = matter(raw);
  return {
    slug: file.replace(/\.mdx$/, ""),
    name: String(data.name ?? ""),
    avatar: data.avatar ? String(data.avatar) : undefined,
    occupation: data.occupation ? String(data.occupation) : undefined,
    company: data.company ? String(data.company) : undefined,
    email: data.email ? String(data.email) : undefined,
    twitter: data.twitter ? String(data.twitter) : undefined,
    linkedin: data.linkedin ? String(data.linkedin) : undefined,
    github: data.github ? String(data.github) : undefined,
    facebook: data.facebook ? String(data.facebook) : undefined,
    youtube: data.youtube ? String(data.youtube) : undefined,
    body: content,
  };
}

// Module scope is per-build, so this reads each file once.
let blogCache: Blog[] | undefined;
let authorCache: Author[] | undefined;

/** Every blog, drafts included, newest first. */
export function allBlogs(): Blog[] {
  blogCache ??= sortByDateDesc(readMdxDir("blogs").map(toBlog));
  return blogCache;
}

/** Published blogs only, newest first. What every public surface should use. */
export function publishedBlogs(): Blog[] {
  return publishedOnly(allBlogs());
}

export function getBlog(slug: string): Blog | undefined {
  return allBlogs().find((blog) => blog.slug === slug);
}

export function allAuthors(): Author[] {
  authorCache ??= readMdxDir("authors").map(toAuthor);
  return authorCache;
}

export function getAuthor(slug: string): Author | undefined {
  return allAuthors().find((author) => author.slug === slug);
}

/** schema.org BlogPosting, previously a contentlayer computed field. */
export function blogStructuredData(blog: Blog, authorNames: string[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: blog.title,
    datePublished: blog.date,
    dateModified: blog.lastmod ?? blog.date,
    description: blog.summary,
    image: blog.images?.[0] ?? siteMetadata.socialBanner,
    url: postUrl(siteMetadata.siteUrl, blog.slug),
    author: authorNames.map((name) => ({ "@type": "Person", name })),
  };
}

/**
 * Props for an inline JSON-LD `<script>`, ready to spread:
 * `<script {...jsonLdScriptProps(blogStructuredData(...))} />`.
 *
 * Centralised here (rather than stringifying at each call site) so the
 * `<` escape can never be forgotten when a second block — an `Organization`,
 * a `BreadcrumbList` — is added. The escape stops a closing script tag inside
 * a string value from ending the element early and injecting markup; it is
 * lossless because that escape is itself valid JSON and parses back to the
 * original character (Google's Rich Results test included sees identical data).
 */
export function jsonLdScriptProps(data: unknown): {
  type: "application/ld+json";
  dangerouslySetInnerHTML: { __html: string };
} {
  return {
    type: "application/ld+json",
    dangerouslySetInnerHTML: {
      __html: JSON.stringify(data).replace(/</g, "\\u003c"),
    },
  };
}
