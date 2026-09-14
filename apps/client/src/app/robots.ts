import { MetadataRoute } from "next";
import siteMetadata from "@/data/siteMetadata";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // The activity API is a dynamic, Redis-backed route; `allow: "/"` alone
      // would invite crawlers to hit it (and burn the store's request quota).
      // `/link/` is the redirector whose `/link/[slug]` entries exist only to
      // bounce to third-party URLs — disallowing it keeps those targets from
      // being crawled/discovered (and the `/link` index itself already sets
      // `robots: noindex`).
      disallow: ["/api/", "/link/"],
    },
    sitemap: `${siteMetadata.siteUrl}/sitemap.xml`,
    host: siteMetadata.siteUrl,
  };
}
