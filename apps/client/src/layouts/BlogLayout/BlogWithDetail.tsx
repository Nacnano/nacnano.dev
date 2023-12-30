import SectionContainer from "@/components/SectionContainer";
import { Authors, Blog } from "contentlayer/generated";
import { CoreContent } from "pliny/utils/contentlayer";
import { ReactNode } from "react";

interface Props {
  content: CoreContent<Blog>;
  authors: CoreContent<Authors>[];
  next?: { path: string; title: string };
  prev?: { path: string; title: string };
  children: ReactNode;
}
export default function BlogWithDetail({
  content,
  authors,
  next,
  prev,
  children,
}: Props) {
  const { filePath, path, slug, date, title, tags } = content;
  const basePath = filePath.split("/")[0];

  return (
    <>
      <SectionContainer>
        <div> BLOG LAYOUT </div>
      </SectionContainer>
    </>
  );
}
