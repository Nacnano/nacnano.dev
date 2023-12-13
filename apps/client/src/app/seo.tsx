import { siteMetaData } from "@/data/siteMetaData";
import { Metadata } from "next";

interface PageSEOProps {
  title: string;
  description: string;
  image?: string;
  [key: string]: any;
}

export function genPageMetaData({
  title,
  description,
  image,
  ...rest
}: PageSEOProps): Metadata {
  return {
    title,
    openGraph: {
      title: `${title} | ${siteMetaData.title}`,
      description: `${description} | ${siteMetaData.description}`,
      url: "./",
      siteName: siteMetaData.title,
      images: image ? [image] : siteMetaData.socialBanner,
      locale: "en_US",
      type: "website",
    },
    twitter: {
      title: `${title} | ${siteMetaData.title}`,
      card: "summary_large_image",
      images: image ? [image] : siteMetaData.socialBanner,
    },
    ...rest,
  };
}
