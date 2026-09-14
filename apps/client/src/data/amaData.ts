/**
 * Answered questions, in the author's own voice — the /ama surface.
 *
 * This is a curated list, not an inbox. The ask box on /ama writes to a private
 * Redis inbox (`lib/amaInbox.ts`); nothing submitted there is ever rendered.
 * An answer appears below only once it has been read, judged worth a public
 * reply, written up, and added here by hand.
 *
 * `answer` is MDX and runs through the same prose pipeline as an essay, so a
 * link or an inline code span renders exactly as it would in a post.
 *
 * Every entry is the author's own words about facts that are already on the
 * site. `PRODUCT.md` applies in full: nothing here may be fabricated — not the
 * claim, not the date it was written, and not the attribution of who asked.
 * If there is no real answer to add, the correct state of this array is empty;
 * the page has an empty state for exactly that.
 */
export type AmaEntry = {
  /** Stable slug used as the on-page anchor, e.g. `what-next`. */
  slug: string;
  /** The question, asked-of phrasing, ending in its own `?`. */
  question: string;
  /** MDX body. Keep it short — this is a reply, not an essay. */
  answer: string;
  /** ISO date the answer was written. Orders the list. */
  date: string;
  /**
   * Who asked, if they agreed to be credited. Omit for an unnamed asker, which
   * is the default — an asker is never invented and never inferred from the
   * inbox metadata.
   */
  askedBy?: string;
  /** Hide without deleting. */
  draft?: boolean;
};

const amaData: AmaEntry[] = [
  {
    slug: "how-to-reach-you",
    question: "How do I reach you about a role?",
    date: "2026-09-14",
    answer:
      "Email is best — there's a mail link in the footer of every page. The box at the bottom of this page reaches me privately too, if a question is easier than an introduction. [The résumé](https://resume.nacnano.dev) is the canonical version of my background; the About page here is a summary kept in sync with it.",
  },
];

export default amaData;
