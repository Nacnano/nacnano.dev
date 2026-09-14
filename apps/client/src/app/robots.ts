import { MetadataRoute } from "next";
import siteMetadata from "@/data/siteMetadata";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // The activity API is a dynamic, Redis-backed route; `allow: "/"` alone
      // would invite crawlers to hit it (and burn the store's request quota).
      disallow: ["/api/"],
    },
    sitemap: `${siteMetadata.siteUrl}/sitemap.xml`,
    host: siteMetadata.siteUrl,
  };
}
