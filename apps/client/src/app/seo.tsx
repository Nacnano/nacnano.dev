import siteMetadata from "@/data/siteMetadata";
import { Metadata } from "next";

/**
 * Per-page SEO helper. `title`/`description`/`image` build the share card; any
 * other `Metadata` field (e.g. `robots`) is passed straight through, which is
 * why the call signature extends `Metadata` minus the fields set here.
 */
type PageSEOProps = {
  title: string;
  description?: string;
  image?: string;
} & Omit<Metadata, "title" | "description" | "openGraph" | "twitter">;

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
