import { coreContent } from "pliny/utils/contentlayer";
import { MDXLayoutRenderer } from "pliny/mdx-components";
import { Authors, allAuthors } from "contentlayer/generated";
import { genPageMetaData } from "@/app/seo";
import AuthorLayout from "@/layouts/AboutLayout/AuthorLayout";

export const metadata = genPageMetaData({
  title: "About",
  description:
    "A bit about Nac — what I've worked on, where I went to school, and how to get hold of me.",
});

export default function About() {
  const author = allAuthors.find(
    (author) => author.slug === "default"
  ) as Authors;
  const mainContent = coreContent(author);
  return (
    <AuthorLayout content={mainContent}>
      <MDXLayoutRenderer code={author.body.code}></MDXLayoutRenderer>
    </AuthorLayout>
  );
}
