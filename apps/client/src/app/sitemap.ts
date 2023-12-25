import { MetadataRoute } from "next";
import siteMetadata from "@/data/siteMetadata";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = siteMetadata.siteUrl;

  // TODO: Add blog posts to sitemap
  //   const blogRoutes = allBlogs.map((post) => ({
  //     url: `${siteUrl}/${post.path}`,
  //     lastModified: post.lastmod || post.date,
  //   }));

  const routes = ["", "blog", "projects", "tags"].map((route) => ({
    url: `${siteUrl}/${route}`,
    lastModified: new Date().toISOString().split("T")[0],
  }));

  return [
    ...routes,
    //...blogRoutes
  ];
}
