import { MetadataRoute } from "next";
import siteMetadata from "@/data/siteMetadata";
import { publishedBlogs } from "@/lib/content";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = siteMetadata.siteUrl;

  const blogRoutes = publishedBlogs().map((post) => ({
    url: `${siteUrl}/${post.path}`,
    lastModified: post.lastmod || post.date,
  }));

  const routes = ["", "projects", "activity", "about"].map((route) => ({
    url: `${siteUrl}/${route}`,
    lastModified: new Date().toISOString().split("T")[0],
  }));

  return [...routes, ...blogRoutes];
}
