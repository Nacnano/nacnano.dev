import type { MDXComponents } from "mdx/types";
import Image from "./Image";
import TOCInline from "pliny/ui/TOCInline";
import Pre from "pliny/ui/Pre";
import CustomLink from "./Link";
import TableWrapper from "./TableWrapper";

/**
 * Every essay closes on one earned line, written as `#### ...`. It is a
 * closing statement rather than a section heading, so it renders as a
 * paragraph-level block instead of an `<h4>` nobody links to.
 */
const Takeaway = ({ children }: { children?: React.ReactNode }) => (
  <p className="takeaway">{children}</p>
);

export const components: MDXComponents = {
  Image,
  TOCInline,
  a: CustomLink,
  pre: Pre,
  table: TableWrapper,
  h4: Takeaway,
};
