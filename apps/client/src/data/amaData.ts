/**
 * Answered questions, in the author's own voice — the /ama surface.
 *
 * This is authored content, not an inbox: the site ships no form, so questions
 * arrive over email / X and only the ones worth a public answer get written up
 * here. `answer` is MDX and runs through the same prose pipeline as an essay,
 * so a link or an inline code span renders exactly as it would in a post.
 *
 * The entries below are STARTERS written from facts already on the site (the
 * résumé, the projects, the stack this repo actually runs on) plus the
 * author's plain-language views. Replace them with real Q&A as it comes in —
 * do not leave placeholder opinions sitting in the author's mouth.
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
  /** Who asked, if it should be credited. Omit for an unnamed asker. */
  askedBy?: string;
  /** Hide without deleting. */
  draft?: boolean;
};

const amaData: AmaEntry[] = [
  {
    slug: "what-next",
    question: "What are you hoping to work on next?",
    askedBy: "a recruiter",
    date: "2026-09-10",
    answer:
      "Ideally somewhere between the two things this site keeps failing to separate — the reflective writing and the dense technical CV. In practice that means AI/ML work where I get to ship the thing to real people, not just score it on a benchmark. I care more about who uses it than how it tests.",
  },
  {
    slug: "stack",
    question: "What stack do you actually enjoy?",
    askedBy: "via X",
    date: "2026-09-06",
    answer:
      "TypeScript, Next.js and Tailwind on the front — this site is the proof. NestJS and Prisma when there's a real service behind it. Python everywhere the models are. I'd take a boring, well-typed system over a clever one every time, and I'll happily spend the afternoon making a build faster just so the next person doesn't have to.",
  },
  {
    slug: "bilingual",
    question: "You write in English but you're Thai — which do you think in?",
    date: "2026-08-28",
    answer:
      "Thai, mostly. The site is in English because that's the language most of the people I want to reach read, but I'll drop into Thai when a thing only lands there — some jokes, some apologies, the way you talk to family. The essays code-switch on purpose; I'm not trying to sound like someone else.",
  },
  {
    slug: "how-you-write",
    question: "How do you end up writing a piece?",
    date: "2026-08-15",
    answer:
      "Something bothers me and I can't let it go. Most drafts die at the point where I have to admit I was the problem. The ones that ship all close on a single line I actually believe — if I can't find that line, the piece wasn't done and it doesn't go up.",
  },
  {
    slug: "proudest-ship",
    question: "What's the thing you're proudest of shipping?",
    date: "2026-08-01",
    answer:
      "The workshop-booking flow for my faculty's open house — thousands of students hitting one form at once, and it held. Less glamorous than the research but it was used by real people on a real day, and nobody got hurt when it mattered.",
  },
  {
    slug: "how-to-reach-you",
    question: "How do I reach you about a role?",
    date: "2026-07-20",
    answer:
      "Email me — the address is in the footer and on [the résumé](https://resume.nacnano.dev), which is the canonical version anyway. A one-paragraph note about what you're building beats a form letter.",
  },
];

export default amaData;
