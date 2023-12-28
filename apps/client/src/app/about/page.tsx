import { coreContent } from "pliny/utils/contentlayer";
import { MDXLayoutRenderer } from "pliny/mdx-components";
import { Authors, allAuthors } from "contentlayer/generated";
import { genPageMetaData } from "@/app/seo";
import AuthorLayout from "@/layouts/AuthorLayout";

export const metadata = genPageMetaData({ title: "About" });

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
