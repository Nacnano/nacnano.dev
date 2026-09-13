import type { MarkKind } from "@/app/projects/ProjectMark";

/**
 * Mirrors the Projects section of https://resume.nacnano.dev. Keep the two in
 * sync; the résumé is the source of truth for what exists and when.
 *
 * `href` is only set where the thing is actually still reachable — an event
 * site that has been taken down gets no link rather than a dead one.
 * `imgSrc` is a real screenshot; `mark` is a drawn diagram for the projects
 * with nothing deployed to capture.
 */
export type Project = {
  title: string;
  description: string;
  stack: string[];
  category: "built" | "research";
  imgSrc?: string;
  mark?: MarkKind;
  href?: string;
  note?: string;
};

const projectsData: Project[] = [
  // ── Things people used ────────────────────────────────────────────────
  {
    title: "CU Get Reg",
    description:
      "An open-source course planner a lot of Chula students use. I worked on the backoffice service behind the reviews and elective data.",
    stack: ["NestJS", "GraphQL", "Prisma"],
    category: "built",
    imgSrc: "/static/images/cugetreg-logo.png",
    href: "https://cugetreg.com",
  },
  {
    title: "CU Get Rekt",
    description:
      "A ten-day go at making withdrawal and resignation paperwork less miserable, with a PDF generator and some score prediction. I did the backend, and it won the hackathon it was built for.",
    stack: ["NestJS", "Prisma"],
    category: "built",
    imgSrc: "/static/images/cugetrekt.png",
    href: "https://cugetrekt.vercel.app/",
  },
  {
    title: "CU Intania Open House 2024",
    description:
      "The open-house site for my faculty. I built the workshop booking part, which had to survive a lot of students hitting it at the same time.",
    stack: ["Next.js", "Firestore"],
    category: "built",
    imgSrc: "/static/images/cu-intania-openhouse-2024.png",
    note: "The site came down after the event.",
  },
  {
    title: "CU First Date & Rub Puen Kao Mai 2024",
    description:
      "Freshman welcome events for the university. I built the registration module — house selection and the QR-based activities.",
    stack: ["Next.js"],
    category: "built",
    mark: "ticket",
  },
  {
    title: "Soul Seasons",
    description:
      "An interactive exhibition site that a few thousand people went through. Mostly an excuse to spend real time on motion.",
    stack: ["Next.js", "Framer Motion"],
    category: "built",
    mark: "seasons",
  },
  {
    title: "E-learning platform",
    description:
      "The backend for an e-learning site — lessons, progress, the usual. My first proper go at deploying on Cloud Run.",
    stack: ["NestJS", "Prisma", "Google Cloud Run"],
    category: "built",
    mark: "lessons",
  },
  {
    title: "MWIT29 Archive",
    description:
      "Somewhere for my high-school cohort to keep their own records. Still unfinished, as these things tend to be.",
    stack: ["Next.js", "MongoDB", "Google Cloud Storage"],
    category: "built",
    imgSrc: "/static/images/mwit29-archive.png",
    href: "https://mwit29-archive.vercel.app/",
  },

  // ── Things I looked into ──────────────────────────────────────────────
  {
    title: "Thai context benchmark for multimodal LLMs",
    description:
      "Built a Thai benchmark for multimodal models, generating the evaluation questions from Visual Genome data. Mostly a lesson in how much of benchmarking is arguing about what counts as a correct answer.",
    stack: ["Python", "Visual Genome"],
    category: "research",
    mark: "grid",
  },
  {
    title: "Fine-tuning a diffusion language model for Thai summarisation",
    description:
      "Supervised fine-tuning of the LLaDA diffusion model for Thai text summarisation, evaluated against the usual suspects with DeepEval. It held up better than I expected on some things and worse on others.",
    stack: ["Python", "LLaDA", "DeepEval"],
    category: "research",
    mark: "denoise",
  },
  {
    title: "Chess move detection from video",
    description:
      "A computer-vision pipeline that turns chess video into notation, fine-tuning ResNet and InceptionV3. It works well on the boards it was trained on, which is the honest caveat.",
    stack: ["Python", "ResNet", "InceptionV3"],
    category: "research",
    mark: "board",
  },
  {
    title: "Stock return forecasting and portfolio optimisation",
    description:
      "Forecasting S&P 500 returns with a handful of ML models, then running portfolio optimisation on top. The backtest looked great, which is exactly when you should be suspicious of a backtest.",
    stack: ["Python", "scikit-learn", "Pandas"],
    category: "research",
    mark: "forecast",
  },
  {
    title: "Multimedia and how students take notes",
    description:
      "A school research project on whether multimedia actually helps people take better notes. Mask R-CNN and a random forest, and a lot of trial and error.",
    stack: ["Python", "Mask R-CNN", "Random Forest"],
    category: "research",
    mark: "segment",
    href: "https://github.com/Nacnano/predicting-and-comparing-learners-interest-in-note-taking-from-multimedia-using-a-machine-learning-",
  },
  {
    title: "GFinder",
    description:
      "A maths model for arguing about the greatest tennis player of all time, built for IMMC 2021. Settles nothing, which is the point.",
    stack: ["Python", "Pandas"],
    category: "research",
    mark: "court",
  },
];

export default projectsData;
