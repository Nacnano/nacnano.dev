/**
 * The shape of the site-wide config below. Kept module-local (not exported):
 * its one job is to constrain the literal via `satisfies`, so an accidental
 * rename or a missing required field is caught at the definition site.
 */
type SiteMetadata = {
  title: string;
  headerTitle: string;
  shortName: string;
  /** The handle used for the wordmark, bylines, title template and copyright. */
  author: string;
  /** The name on the documents — kept in structured data and on About. */
  legalName: string;
  greeting: string;
  description: string;
  now: string;
  language: string;
  locale: string;
  theme: "light" | "dark" | "system";
  siteUrl: string;
  siteRepo: string;
  siteLogo: string;
  socialBanner: string;
  resume: string;
  email: string;
  // All present in the object and read unconditionally by the footer / author
  // cards, so they are required rather than aspirationally optional.
  facebook: string;
  twitter: string;
  instagram: string;
  github: string;
  linkedin: string;
  youtube: string;
};

const siteMetadata = {
  title: "Nacnano",
  // The handle is the identity everywhere the site speaks for itself:
  // wordmark, bylines, title template, copyright.
  author: "Nacnano",
  // The name on the documents. Kept on the About page and in the structured
  // data so a search for it still finds this site.
  legalName: "Chotpisit Adunsehawat",
  headerTitle: "Nacnano",
  shortName: "Nacnano",
  // Nac is what people actually call him; the site greets in that voice.
  greeting: "Hi, I'm Nac",
  description:
    "I build things on the internet and write about the bits I got wrong, which is usually the interesting part.",
  // Casual, and easy to change. Shown on the About page, not the front door.
  now: "Currently in Bangkok, looking for my next thing, and slowly working through a list of half-written drafts.",
  language: "en-us",
  theme: "system",
  siteUrl: "https://www.nacnano.dev",
  siteRepo: "https://github.com/nacnano/nacnano.dev",
  siteLogo: "/static/images/logo.png",
  socialBanner: "/static/images/oong-oong.jpg",
  resume: "https://resume.nacnano.dev",
  email: "chotpisit.adu@gmail.com",
  facebook: "https://www.facebook.com/chotpisit.adunsehawat/",
  twitter: "https://twitter.com/Nacnano1",
  instagram: "https://www.instagram.com/chotpisit_nac/",
  github: "https://www.github.com/nacnano",
  linkedin: "https://www.linkedin.com/in/chotpisit-adunsehawat-b68912210/",
  youtube: "https://www.youtube.com/channel/UC35blZ3e07Srxg_bbdXLZKQ",
  locale: "en-US",
} satisfies SiteMetadata;

export default siteMetadata;