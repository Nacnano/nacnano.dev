import "@/styles/tailwind.css";

import { Inter } from "next/font/google";

import { Metadata } from "next";
import siteMetadata from "@/data/siteMetadata";
import SectionContainer from "@/components/SectionContainer";
import { ThemeProviders } from "./theme-provider";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import VisitTracker from "@/components/VisitTracker";
import { isActivityLive } from "@/lib/activity";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteMetadata.siteUrl),
  title: {
    default: siteMetadata.title,
    template: `%s · ${siteMetadata.author}`,
  },
  description: siteMetadata.description,
  openGraph: {
    title: siteMetadata.title,
    description: siteMetadata.description,
    url: "./",
    siteName: siteMetadata.title,
    images: [siteMetadata.socialBanner],
    locale: "en_US",
    type: "website",
  },
  alternates: {
    canonical: "./",
    types: {
      "application/rss+xml": `${siteMetadata.siteUrl}/feed.xml`,
    },
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  twitter: {
    title: siteMetadata.title,
    card: "summary_large_image",
    images: [siteMetadata.socialBanner],
  },
};

const directionContract = `
  THESIS: A working engineer's site where the name, the status and the writing
  are all legible in one viewport. It refuses the template arrangement it
  replaced: a page headed "Latest" that never said whose site it was.
  OWN-WORLD: Neutral zinc ground, one blue accent (600 light / 300 dark), hairline
  rules instead of cards, one elevation step, Inter for prose and system mono for
  dates and figures. Tabular numerals in every metadata rail.
  STORY: A visitor learns who this is, that he is open to work, and that the
  essays are how he thinks — then reads one.
  FIRST VIEWPORT: Name at display size, a one-line status, a two-sentence
  positioning paragraph, then Résumé / Projects / GitHub as the first links, then
  the essay list under a hairline rule.
  FORM: The standing exit — the category standard executed straight, chosen over
  four dealt worlds. Craft bar: brianlovin.com, rauchg.com. Seed key b5c6a34c.
  FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review.
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang={siteMetadata.language}
      className={`${inter.variable} scroll-smooth`}
      suppressHydrationWarning={true}
    >
      <head>
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/static/favicons/apple-touch-icon.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href="/static/favicons/favicon-32x32.png"
        />
        <link rel="manifest" href="/static/favicons/site.webmanifest" />
        <meta name="msapplication-TileColor" content="#09090b" />
        <meta
          name="theme-color"
          media="(prefers-color-scheme: light)"
          content="#ffffff"
        />
        <meta
          name="theme-color"
          media="(prefers-color-scheme: dark)"
          content="#09090b"
        />
        <link rel="alternate" type="application/rss+xml" href="/feed.xml" />
      </head>
      <body className="bg-white font-sans text-zinc-900 antialiased dark:bg-zinc-950 dark:text-zinc-100">
        <div dangerouslySetInnerHTML={{ __html: `<!--${directionContract}-->` }} />
        <VisitTracker live={isActivityLive()} />
        <ThemeProviders>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-zinc-900 focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white dark:focus:bg-zinc-100 dark:focus:text-zinc-900"
          >
            Skip to content
          </a>
          <SectionContainer>
            <div className="flex min-h-screen flex-col">
              <Header />
              <main id="main" className="mb-auto">
                {children}
              </main>
              <Footer />
            </div>
          </SectionContainer>
        </ThemeProviders>
      </body>
    </html>
  );
}
