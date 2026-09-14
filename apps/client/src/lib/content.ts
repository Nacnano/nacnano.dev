import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
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

/**
 * A missing required field is a hard build failure naming the file and field —
 * the alternative (silent coercion) turns "this post renders oddly" into a
 * production mystery. `tags`/`images`/`authors` are coerced leniently today, so
 * a typo'd frontmatter key or a scalar where a list was meant slips through;
 * these guards catch that at build.
 */
function requireNonEmptyString(value: unknown, field: string, file: string): string {
  const str = typeof value === "string" ? value.trim() : "";
  if (!str) throw new Error(`blogs/${file}: \`${field}\` must be a non-empty string`);
  return str;
}

function requireIsoDate(value: unknown, field: string, file: string): string {
  const date = new Date(value as string | number);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`blogs/${file}: \`${field}\` is not a valid date (${String(value)})`);
  }
  return date.toISOString();
}

function requireStringArray(
  value: unknown,
  field: string,
  file: string
): string[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error(`blogs/${file}: \`${field}\` must be an array of strings`);
  }
  return value;
}

function toBlog({ file, raw }: { file: string; raw: string }): Blog {
  const { data, content } = matter(raw);
  const slug = file.replace(/\.mdx$/, "");

  return {
    slug,
    path: `blogs/${slug}`,
    filePath: `blogs/${file}`,
    title: requireNonEmptyString(data.title, "title", file),
    date: requireIsoDate(data.date, "date", file),
    lastmod:
      data.lastmod === undefined
        ? undefined
        : requireIsoDate(data.lastmod, "lastmod", file),
    summary: data.summary ? String(data.summary) : undefined,
    tags: requireStringArray(data.tags, "tags", file) ?? [],
    draft: data.draft === true,
    images: requireStringArray(data.images, "images", file),
    authors: requireStringArray(data.authors, "authors", file),
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
