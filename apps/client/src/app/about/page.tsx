import { genPageMetaData } from "@/app/seo";
import { PAGE_TITLES } from "@/data/pageTitles";
import AuthorLayout from "@/layouts/AboutLayout/AuthorLayout";
import Mdx from "@/components/Mdx";
import { getAuthor } from "@/lib/content";
import { notFound } from "next/navigation";

export const metadata = genPageMetaData({
  title: PAGE_TITLES.about,
  description:
    "A bit about Nac — what I've worked on, where I went to school, and how to get hold of me.",
});

export default function About() {
  const author = getAuthor("default");
  if (!author) notFound();

  return (
    <AuthorLayout content={author}>
      <Mdx source={author.body} />
    </AuthorLayout>
  );
}
