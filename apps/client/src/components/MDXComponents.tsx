import type { MDXComponents } from "mdx/types";
import Image from "./Image";
import TOCInline from "pliny/ui/TOCInline";
import Pre from "pliny/ui/Pre";
import CustomLink from "./Link";

export const components: MDXComponents = {
  Image,
  TOCInline,
  a: CustomLink,
  pre: Pre,
  // BlogNewsLetterForm,
};
