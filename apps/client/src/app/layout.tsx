import { Inter } from "next/font/google";

import { Metadata } from "next";
import { AppProvider } from "../core/context/appProvider";
import { NavigationBar } from "@/layouts/NavigationBar";
import { siteMetaData } from "@/data/siteMetaData";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
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
    // images:
    locale: "en_US",
    type: "website",
  },
};

type RootLayoutProps = {
  children: React.ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <AppProvider>
        <NavigationBar />
        <body>{children}</body>
      </AppProvider>
    </html>
  );
}
