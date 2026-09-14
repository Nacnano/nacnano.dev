/**
 * The read side of the /ama surface.
 *
 * The content itself is static (see `@/data/amaData`); everything here is a pure
 * helper over it, mirroring how `lib/content.ts` wraps the MDX corpus. Ordering
 * and draft-hiding are borrowed from `lib/posts.ts` so there is exactly one
 * implementation of "newest first, no drafts" in the codebase, and the only
 * thing AMA adds on top is the structured data and the markdown-to-text needed
 * to feed that structured data honestly.
 */

import siteMetadata from "@/data/siteMetadata";
import amaData, { type AmaEntry } from "@/data/amaData";
import { publishedOnly, sortByDateDesc } from "./posts";

/** Answered questions, drafts hidden, newest first. */
export function publishedAma(): AmaEntry[] {
  return sortByDateDesc(publishedOnly(amaData));
}

/**
 * Strip the markdown an MDX answer is written in down to readable text, for
 * schema.org (where raw `**bold**` and `[link](url)` would leak into the
 * snippet). Deliberately conservative — it only removes syntax the MDX
 * pipeline actually understands, and never invents prose that wasn't there.
 */
export function mdToPlainText(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, " ") // fenced code blocks
    .replace(/`([^`]*)`/g, "$1") // inline code
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "") // images (no alt text into the answer)
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // links -> their text
    .replace(/^\s{0,3}#{1,6}\s+/gm, "") // heading markers
    .replace(/^\s*>\s?/gm, "") // blockquote markers
    .replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, "$1") // emphasis
    .replace(/[ \t]+/g, " ")
    .replace(/\n/g, " ")
    .trim();
}

/** schema.org FAQPage — the list of answered questions, newest first. */
export function amaStructuredData(entries: readonly AmaEntry[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: entries.map((entry) => ({
      "@type": "Question",
      name: entry.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: mdToPlainText(entry.answer),
        dateCreated: entry.date,
        author: { "@type": "Person", name: siteMetadata.author },
      },
    })),
  };
}
