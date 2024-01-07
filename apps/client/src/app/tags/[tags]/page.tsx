import { genPageMetaData } from "@/app/seo";
import ListLayout from "@/layouts/ListLayout";
import { allBlogs } from "contentlayer/generated";
import { allCoreContent, sortPosts } from "pliny/utils/contentlayer";
import { slug } from "github-slugger";
import tagData from "app/tag-data.json";
import siteMetadata from "@/data/siteMetadata";

export async function getStaticPaths({ params }: { params: { tags: string } }) {
  const tag = decodeURI(params.tags);

  return genPageMetaData({
    title: "Tags",
    description: `${siteMetadata.title} ${tag} tagged content`,
    alternates: {
      canonical: `./`,
      types: {
        "application/rss+xml": `${siteMetadata.siteUrl}/tags/${tag}/feed.xml`,
      },
    },
  });
}

export const generateStaticParams = async () => {
  const tagCount = tagData as Record<string, number>;
  const tagKeys = tagCount.Count ? Object.keys(tagCount) : [];
  const paths = tagKeys.map((tag) => {
    tag = decodeURI(tag);
  });

  return paths;
};

export default function Page({ params }: { params: { tags: string } }) {
  const tag = decodeURI(params.tags);
  const title = tag[0].toUpperCase() + tag.split(" ").join("-").slice(1);
  const filterBlogs = allCoreContent(sortPosts(allBlogs)).filter((blog) => {
    blog.tags && blog.tags.map((_tag) => slug(_tag)).includes(tag);
  });

  return (
    <>
      <ListLayout title={title} blogs={filterBlogs} />
    </>
  );
}
