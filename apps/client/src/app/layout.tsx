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
      <ThemeProviders>
        <SectionContainer>
          <div className="">
            <Header />
            <body>{children}</body>
          </div>
        </SectionContainer>
      </ThemeProviders>
    </html>
  );
}
