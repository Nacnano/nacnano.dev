const projectsData = [
  {
    title: "CU Intania Open House 2024",
    description:
      "The event site for the Faculty of Engineering open house at Chulalongkorn, used by over 9,000 students. I designed and built the workshop reservation feature.",
    stack: ["Next.js", "Firestore"],
    imgSrc: "/static/images/cu-intania-openhouse-2024.png",
    href: "https://oph.chula.engineering/",
  },
  {
    title: "CU Get Reg",
    description:
      "An open-source course planner for Chulalongkorn students. I built the backoffice service that manages more than 700 reviews and 500 elective courses, serving up to 15,000 users a week.",
    stack: ["NestJS", "GraphQL", "Prisma"],
    imgSrc: "/static/images/cugetreg-logo.png",
    href: "https://cugetreg.com",
  },
  {
    title: "CU Get Rekt",
    description:
      "A ten-day project making student withdrawals and resignations less painful, through an automated PDF generator and score prediction. I designed, built, deployed and maintained the backend.",
    stack: ["NestJS", "Prisma"],
    imgSrc: "/static/images/cugetrekt.png",
    href: "https://cugetrekt.vercel.app/",
  },
  {
    title: "Learner Interest in Multimedia Note-Taking",
    description:
      "A research project using Mask R-CNN for image segmentation and a random forest for factor identification, analysing how multimedia affects students' learning efficiency.",
    stack: ["Python", "Mask R-CNN", "Random Forest"],
    imgSrc: "/static/images/computer-project.png",
    href: "https://github.com/Nacnano/predicting-and-comparing-learners-interest-in-note-taking-from-multimedia-using-a-machine-learning-",
  },
  {
    title: "MWIT29 Archive",
    description:
      "An archive of my high school cohort, letting students edit their own records. Still in progress.",
    stack: ["Next.js", "MongoDB", "Google Cloud Storage"],
    imgSrc: "/static/images/mwit29-archive.png",
    href: "https://mwit29-archive.vercel.app/",
  },
];

export default projectsData;
