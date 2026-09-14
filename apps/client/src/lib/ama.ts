/**
 * The read side of the /ama surface.
 *
 * The content itself is static (see `@/data/amaData`); everything here is a pure
 * helper over it, mirroring how `lib/content.ts` wraps the MDX corpus. Ordering
 * and draft-hiding are borrowed from `lib/posts.ts` so there is exactly one
 * implementation of "newest first, no drafts" in the codebase, and the only
 * thing AMA adds on top is the structured data and the markdown-to-text needed
 * to feed that structured data honestly.
 *
 * The write side — the ask box that drops a question into a private inbox — is
 * `lib/amaInbox.ts`. Nothing submitted there reaches this module; an answer only
 * appears on the page once it has been written into `amaData.ts` by hand.
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
 *
 * Emphasis is the one rule that needs care. A naive `[*_]{1,3}(...)[*_]{1,3}`
 * treats the underscores in `snake_case_name` as delimiters and silently
 * deletes them, which breaks that promise on exactly the answers most likely to
 * contain an identifier. So the two markers are handled separately: asterisks
 * must be *matched* (`**x**`, not `*x**`), and underscores must additionally sit
 * on a word boundary, leaving intra-word ones alone.
 */
export function mdToPlainText(md: string): string {
  return (
    md
      .replace(/```[\s\S]*?```/g, " ") // fenced code blocks
      .replace(/`([^`]*)`/g, "$1") // inline code
      .replace(/!\[[^\]]*\]\([^)]*\)/g, "") // images (no alt text into the answer)
      .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // links -> their text
      .replace(/^\s{0,3}#{1,6}\s+/gm, "") // heading markers
      .replace(/^\s*>\s?/gm, "") // blockquote markers
      .replace(/(\*{1,3})(?=\S)([\s\S]*?\S)\1/g, "$2") // *em* / **strong**
      .replace(/(?<![\p{L}\p{N}_])(_{1,3})(?=\S)([\s\S]*?\S)\1(?![\p{L}\p{N}_])/gu, "$2")
      // Collapse every run of whitespace — newlines included — in ONE pass.
      // Split into two rules (spaces first, then newlines) and a paragraph
      // break survives the first, reaching the structured data as a double
      // space.
      .replace(/\s+/g, " ")
      .trim()
  );
}

/**
 * schema.org FAQPage — the list of answered questions, newest first.
 *
 * Worth knowing before this is counted as an SEO win: Google retired FAQPage
 * rich results in August 2023 for everything but government and health sites.
 * The markup is still valid and other consumers still read it, so it is emitted
 * — but discoverability for a given question comes from the page, not from this.
 */
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
