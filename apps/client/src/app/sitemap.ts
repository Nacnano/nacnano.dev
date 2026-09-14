import { MetadataRoute } from "next";
import siteMetadata from "@/data/siteMetadata";
import { publishedBlogs } from "@/lib/content";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = siteMetadata.siteUrl;

  const blogRoutes = publishedBlogs().map((post) => ({
    url: `${siteUrl}/${post.path}`,
    lastModified: post.lastmod || post.date,
  }));

  // The marketing pages have no content date of their own; stamping them with
  // "today" on every build made the whole sitemap churn. Publish them without a
  // lastModified rather than a fabricated one.
  const routes = ["", "projects", "activity", "ama", "about"].map((route) => ({
    url: `${siteUrl}/${route}`,
  }));

  return [...routes, ...blogRoutes];
}
