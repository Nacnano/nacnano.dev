/**
 * Reconciled against https://resume.nacnano.dev (the canonical CV) on
 * 2026-09-13. The previous version of this file disagreed with the résumé on
 * GPA, omitted the SCB and QuanXAI roles, mislabelled the SCBX title, and
 * marked two ended roles as "Present". The résumé wins; keep them in sync.
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
  current?: boolean;
};

export const workItems: TimelineItem[] = [
  {
    period: "Jan – Apr 2026",
    start: "2026-01-01",
    title: "Data Scientist, Intern",
    organisation: "SCB",
    description:
      "NLP research on FOMC market sentiment analysis.",
  },
  {
    period: "Jan – Mar 2026",
    start: "2026-01-01",
    title: "AI Engineer, Part Time",
    organisation: "QuanXAI",
    description:
      "LangChain chatbot development and a machine-learning fraud detection proof of concept.",
  },
  {
    period: "Aug – Dec 2025",
    start: "2025-08-01",
    title: "AI Researcher and Technology Risk, Intern",
    organisation: "SCBX",
    location: "Bangkok, Thailand",
    description:
      "Stock market prediction research and cybersecurity chatbot testing.",
  },
  {
    period: "Jun – Aug 2025",
    start: "2025-06-01",
    title: "AI Researcher, Intern",
    organisation: "Japan Advanced Institute of Science and Technology",
    location: "Nomi, Japan",
    description:
      "AI safety and alignment research on the mechanistic interpretability of chain-of-thought reasoning and randomness in large language models.",
  },
  {
    period: "May – Jul 2025",
    start: "2025-05-01",
    title: "Software Engineer, Part Time",
    organisation: "Ayasan Holding",
    location: "Remote",
    description:
      "Feature development across the Next.js and Nuxt.js web apps and the React Native mobile app.",
  },
  {
    period: "Nov 2024 – Jun 2025",
    start: "2024-11-01",
    title: "Data Engineer, Part Time",
    organisation: "People's Party",
    location: "Bangkok, Thailand",
    description:
      "Deployed a RAG LLM, built BigQuery pipelines with Apache Airflow, and integrated data through Krayin CRM.",
  },
  {
    period: "Jun – Nov 2024",
    start: "2024-06-01",
    title: "Software Engineer, Intern",
    organisation: "Agoda",
    location: "Bangkok, Thailand",
    description:
      "Migrated a .NET and Scala internal tool to Kotlin, and integrated OPA and Okta OAuth2 Proxy for authorization.",
  },
  {
    period: "Mar 2022 – Dec 2025",
    start: "2022-03-01",
    title: "Software Engineer and Data Analyst, Part Time",
    organisation: "MonkeyEveryday",
    location: "Bangkok, Thailand",
    description:
      "Built and maintained the TCAS simulation service used by over 40,000 people, across Next.js, Vue.js and NestJS.",
  },
  {
    period: "Jun – Aug 2023",
    start: "2023-06-01",
    title: "Full Stack Developer, Intern",
    organisation: "Wang Data Market",
    location: "Bangkok, Thailand",
    description:
      "Implemented form input types in React and new Express.js API endpoints.",
  },
];

export const educationItems: TimelineItem[] = [
  {
    period: "2022 – 2026",
    start: "2022-08-01",
    title: "B.Eng. Computer Engineering",
    organisation: "Chulalongkorn University",
    location: "Bangkok, Thailand",
    description:
      "GPA 3.93/4.00. Teaching assistant for Computer Engineering Essentials (backend).",
  },
  {
    period: "2019 – 2022",
    start: "2019-05-01",
    title: "High School",
    organisation: "Mahidol Wittayanusorn School",
    location: "Thailand",
    description:
      "GPA 4.00. Exchange programmes, international symposiums, and the POSN Computer Olympiad camps.",
  },
  {
    period: "2016 – 2019",
    start: "2016-05-01",
    title: "Secondary School",
    organisation: "Suankularb Wittayalai School",
    location: "Thailand",
    description: "GPA 3.56. Played football all day. Started coding.",
  },
];
