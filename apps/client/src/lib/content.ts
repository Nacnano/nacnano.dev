import { readFileSync, readdirSync } from "fs";
import path from "path";
import matter from "gray-matter";
import readingTime from "reading-time";
import siteMetadata from "@/data/siteMetadata";
import { postUrl } from "@/lib/feed";
import { LAYOUT_NAMES } from "@/lib/blogLayouts";
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
 * A missing or malformed field is a hard build failure naming the file and
 * field — the alternative (silent coercion) turns "this post renders oddly"
 * into a production mystery. Exported so the reject branches are unit-testable
 * without touching disk. `typeof value` is surfaced in each message so a 3 a.m.
 * "why does this post look wrong" becomes a 10-second fix.
 */
export function requireNonEmptyString(
  value: unknown,
  field: string,
  file: string
): string {
  const str = typeof value === "string" ? value.trim() : "";
  if (!str) throw new Error(`blogs/${file}: \`${field}\` must be a non-empty string`);
  return str;
}

export function requireIsoDate(value: unknown, field: string, file: string): string {
  // gray-matter yields a `Date` for an unquoted YAML date and a `string` for a
  // quoted one. Anything else — a bare year (`date: 2026`), a boolean, an array
  // — is a typo, and would otherwise coerce to a bogus 1970 timestamp that sorts
  // the post to the bottom of the feed and poisons the RSS `lastBuildDate`.
  if (!(value instanceof Date) && typeof value !== "string") {
    throw new Error(
      `blogs/${file}: \`${field}\` must be a date (string or Date), got ${describe(value)}`
    );
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(
      `blogs/${file}: \`${field}\` is not a valid date (${describe(value)})`
    );
  }
  return date.toISOString();
}

export function requireStringArray(
  value: unknown,
  field: string,
  file: string
): string[] | undefined {
  if (value === undefined) return undefined;
  // `.every` with a type predicate narrows to `string[]`; a `.some(!== string)`
  // guard would leave `value` as `any[]`.
  if (
    !Array.isArray(value) ||
    !value.every((item): item is string => typeof item === "string")
  ) {
    throw new Error(`blogs/${file}: \`${field}\` must be an array of strings`);
  }
  return value;
}

export function requireBooleanOrUndefined(
  value: unknown,
  field: string,
  file: string
): boolean | undefined {
  // `draft` is the field whose failure mode is publishing something you didn't
  // mean to (a quoted `draft: 'true'` is truthy-but-not-true). Refuse to guess.
  if (value === undefined) return undefined;
  if (typeof value !== "boolean") {
    throw new Error(
      `blogs/${file}: \`${field}\` must be an unquoted boolean (true/false), got ${describe(value)}`
    );
  }
  return value;
}

export function requireOptionalString(
  value: unknown,
  field: string,
  file: string
): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") {
    throw new Error(
      `blogs/${file}: \`${field}\` must be a string when present, got ${describe(value)}`
    );
  }
  return value.trim() || undefined;
}

export function requireKnownLayout(
  value: unknown,
  field: string,
  file: string
): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string" || !(LAYOUT_NAMES as readonly string[]).includes(value)) {
    throw new Error(
      `blogs/${file}: \`${field}\` must be one of ${LAYOUT_NAMES.join(", ")}, got ${describe(value)}`
    );
  }
  return value;
}

/** Short, safe rendering of an offending value for an error message. */
function describe(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "an array";
  if (typeof value === "object") return "an object";
  return `${typeof value} (${String(value)})`;
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
    summary: requireOptionalString(data.summary, "summary", file),
    tags: requireStringArray(data.tags, "tags", file) ?? [],
    draft: requireBooleanOrUndefined(data.draft, "draft", file) ?? false,
    images: requireStringArray(data.images, "images", file),
    authors: requireStringArray(data.authors, "authors", file),
    layout: requireKnownLayout(data.layout, "layout", file),
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
