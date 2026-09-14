/**
 * Answered questions, in the author's own voice. The /ama surface.
 *
 * A curated list, not an inbox. The ask box writes to a private Redis inbox
 * (`lib/amaInbox.ts`) that nothing renders. An answer appears here only after
 * it has been read, judged worth a public reply, and written up by hand.
 *
 * `answer` is MDX and runs through the same prose pipeline as an essay, so a
 * link or an inline code span renders as it would in a post.
 *
 * `PRODUCT.md` applies in full: nothing here may be fabricated. Not the claim,
 * not the date it was written, not who asked. If there is no real answer to
 * add, the right state of this array is empty, and the page handles that.
 */
export type AmaEntry = {
  /** Stable slug used as the on-page anchor, e.g. `over-engineered`. */
  slug: string;
  /** The question, asked-of phrasing, ending in its own `?`. */
  question: string;
  /** MDX body. Keep it short. This is a reply, not an essay. */
  answer: string;
  /** ISO date the answer was written. Orders the list. */
  date: string;
  /**
   * Who asked, if they agreed to be credited. Omit for an unnamed asker, which
   * is the default. An asker is never invented, and never inferred from the
   * inbox metadata.
   */
  askedBy?: string;
  /** Hide without deleting. */
  draft?: boolean;
};

const amaData: AmaEntry[] = [
  {
    slug: "over-engineered",
    question: "Isn't this site a bit over-engineered for a personal blog?",
    date: "2026-09-14",
    answer:
      "Yes. There's a design doc, a product doc, a content security policy and a full test suite, all sitting in front of a handful of essays and a photo of me.\n\nI tell myself it's practice. It's also a very comfortable way to avoid writing the next essay.",
  },
];

export default amaData;
