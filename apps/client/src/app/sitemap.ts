import { MetadataRoute } from "next";
import { siteMetaData } from "@/data/siteMetaData";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = siteMetaData.siteUrl;

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
