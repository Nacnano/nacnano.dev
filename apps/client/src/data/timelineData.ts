/**
 * Reconciled against https://resume.nacnano.dev (the canonical CV) on
 * 2026-09-16. Every date, title and employer here matches it — the wording is
 * deliberately casual, but the facts are not negotiable. Keep them in sync.
 *
 * Locations are only recorded where they are actually known — do not invent.
 */

export type TimelineItem = {
  period: string;
  /** Sort key: the entry's start date, ISO. */
  start: string;
  title: string;
  organisation: string;
  location?: string;
  description?: string;
};

export const workItems: TimelineItem[] = [
  {
    period: "Jan – Apr 2026",
    start: "2026-01-01",
    title: "Data Scientist, Intern",
    organisation: "SCB",
    location: "Bangkok",
    description:
      "Poked at FOMC statements with NLP to see whether the market's mood was hiding in the wording.",
  },
  {
    period: "Jan – Mar 2026",
    start: "2026-01-01",
    title: "AI Engineer, Part Time",
    organisation: "QuanXAI",
    location: "Bangkok",
    description:
      "A LangChain chatbot, and a fraud-detection proof of concept that mostly taught me how messy real data is.",
  },
  {
    period: "Aug – Dec 2025",
    start: "2025-08-01",
    title: "AI Researcher and Technology Risk, Intern",
    organisation: "SCBX",
    location: "Bangkok",
    description:
      "Stock-market prediction research, and a stretch spent trying to talk a cybersecurity chatbot into misbehaving.",
  },
  {
    period: "Jun – Aug 2025",
    start: "2025-06-01",
    title: "AI Researcher, Intern",
    organisation: "JAIST",
    location: "Nomi, Japan",
    description:
      "Tried to work out what language models are actually doing when they 'reason'. Came away with more questions than answers.",
  },
  {
    period: "May – Jul 2025",
    start: "2025-05-01",
    title: "Software Engineer, Part Time",
    organisation: "Ayasan Holding",
    location: "Remote",
    description: "Shipped features across the web apps and the React Native app.",
  },
  {
    period: "Nov 2024 – Jun 2025",
    start: "2024-11-01",
    title: "Data Engineer, Part Time",
    organisation: "People's Party",
    location: "Bangkok",
    description:
      "Built data pipelines and got a retrieval chatbot running on top of them.",
  },
  {
    period: "Jun – Nov 2024",
    start: "2024-06-01",
    title: "Software Engineer, Intern",
    organisation: "Agoda",
    location: "Bangkok",
    description:
      "Moved an internal tool off .NET and Scala onto Kotlin, and wired up the authorization behind it.",
  },
  {
    period: "Mar 2022 – Dec 2025",
    start: "2022-03-01",
    title: "Software Engineer and Data Analyst, Part Time",
    organisation: "MonkeyEveryday",
    location: "Bangkok",
    description:
      "Looked after a university-admissions simulator that a lot of anxious students refreshed every year. Nearly four years of it.",
  },
  {
    period: "Jun – Aug 2023",
    start: "2023-06-01",
    title: "Full Stack Developer, Intern",
    organisation: "Wang Data Market",
    location: "Bangkok",
    description:
      "Form inputs in React, endpoints in Express. My first proper look at someone else's codebase.",
  },
];

export const educationItems: TimelineItem[] = [
  {
    period: "2022 – 2026",
    start: "2022-08-01",
    title: "Computer Engineering",
    organisation: "Chulalongkorn University",
    location: "Bangkok",
    description:
      "Somehow made it through four years of it — mostly on stubbornness, good friends, and more luck than skill.",
  },
  {
    period: "2019 – 2022",
    start: "2019-05-01",
    title: "High school",
    organisation: "Mahidol Wittayanusorn School",
    description:
      "A boarding school for science kids. Went on a few exchanges and entered more competitions than I won.",
  },
  {
    period: "2016 – 2019",
    start: "2016-05-01",
    title: "Secondary school",
    organisation: "Suankularb Wittayalai School",
    description:
      "Played football all day. Wrote my first line of code somewhere in between.",
  },
];
