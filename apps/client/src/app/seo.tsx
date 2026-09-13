import siteMetadata from "@/data/siteMetadata";
import { Metadata } from "next";

interface PageSEOProps {
  title: string;
  description?: string;
  image?: string;
  [key: string]: any;
}

export function genPageMetaData({
  title,
  description,
  image,
  ...rest
}: PageSEOProps): Metadata {
  // Every caller without a description used to ship the literal string
  // "undefined | ..." into the share card.
  const resolvedDescription = description ?? siteMetadata.description;
  const images = image ? [image] : [siteMetadata.socialBanner];

  return {
    title,
    description: resolvedDescription,
    openGraph: {
      title: `${title} · ${siteMetadata.author}`,
      description: resolvedDescription,
      url: "./",
      siteName: siteMetadata.title,
      images,
      locale: "en_US",
      type: "website",
    },
    twitter: {
      title: `${title} · ${siteMetadata.author}`,
      description: resolvedDescription,
      card: "summary_large_image",
      images,
    },
    ...rest,
  };
}
