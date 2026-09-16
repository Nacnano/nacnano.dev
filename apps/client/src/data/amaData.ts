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
    slug: "wandering",
    question: "What do you mean by wandering?",
    date: "2026-09-16",
    answer:
      "It usually means picking an area and walking around without planning everything in advance. Sometimes it becomes a few days with a backpack and a hostel; sometimes it is just getting off somewhere and seeing what I find.\n\nI like the ordinary parts most: canals, small alleys, old buildings, local cafés and watching how people live. Occasionally I talk to someone and discover a whole story—like meeting a retired software engineer running a coffee truck under a bridge.\n\nBasically, I wander because I am curious. I also get lost, run out of battery and occasionally lock myself outside my hostel room at 2 a.m. Those are apparently part of the process.",
  },
  {
    slug: "after-graduation",
    question: "What's next after graduation?",
    date: "2026-09-16",
    answer:
      "I'm still deciding. The same two sides keep fighting in my head: becoming better at technical work and saving money, or travelling and collecting more experiences.\n\nRealistically, I want to work in tech, keep learning and pay for my own trips. Ideally, I'll find work flexible enough that I can do both—maybe even work remotely while travelling.\n\nSo the plan after graduation is currently: get a job, keep wandering and hope adulthood does not force me to choose only one.",
  },
];

export default amaData;
