"use client";

import { Inter } from "next/font/google";

import { Metadata } from "next";
import { siteMetaData } from "@/data/siteMetaData";
import SectionContainer from "@/components/SectionContainer";
import { ThemeProviders } from "./theme-provider";
import Header from "@/components/Header";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const metadata: Metadata = {
  metadataBase: new URL(siteMetaData.siteUrl),
  title: {
    default: siteMetaData.title,

    template: `%s" | ${siteMetaData.title}`,
  },
  description: siteMetaData.description,
  openGraph: {
    title: siteMetaData.title,
    description: siteMetaData.description,
    url: "./",
    siteName: siteMetaData.title,
    images: [siteMetaData.socialBanner],
    locale: "en_US",
    type: "website",
  },
  robots: {
    index: false,
    follow: true,
    nocache: true,
    googleBot: {
      index: true,
      follow: false,
      noimageindex: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

type RootLayoutProps = {
  children: React.ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html
      lang={siteMetaData.language}
      className={"${inter.variable} scroll-smooth"}
      suppressHydrationWarning
    >
      <link
        rel="apple-touch-icon"
        sizes="32x32"
        href="/static/favicons/apple-touch-icon.png"
      />
      <link
        rel="icon"
        type="image/png"
        sizes="32x32"
        href="/static/favicons/favicon-32x32.png"
      />
      <meta
        name="theme-color"
        media="(prefers-color-scheme: light)"
        content="#fff"
      />
      <meta
        name="theme-color"
        media="(prefers-color-scheme: dark)"
        content="#000"
      />
      <link rel="alternate" type="application/rss+xml" href="/feed.xml" />
      <body className="bg-white text-black antialiased dark:bg-gray-950 dark:text-white">
        <ThemeProviders>
          <SectionContainer>
            <div className="flex h-screen flex-col justify-center font-sans">
              <Header />
              <main className="mb-auto">{children}</main>
            </div>
          </SectionContainer>
        </ThemeProviders>
      </body>
    </html>
  );
}
