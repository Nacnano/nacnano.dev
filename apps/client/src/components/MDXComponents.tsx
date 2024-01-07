import type { MDXComponents } from "mdx/types";
import Image from "./Image";
import TOCInline from "pliny/ui/TOCInline";
import Pre from "pliny/ui/Pre";
import BlogNewsLetterForm from "pliny/ui/BlogNewsLetterForm";
import CustomLink from "./Link";
import TableWrapper from "./TableWrapper";

export const components: MDXComponents = {
  Image,
  TOCInline,
  a: CustomLink,
  pre: Pre,
  table: TableWrapper,
  BlogNewsLetterForm,
};
