import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypePrismPlus from "rehype-prism-plus";
import { components } from "@/components/MDXComponents";

/**
 * The MDX pipeline, previously configured through contentlayer.
 *
 * Dropped along the way: rehype-citation (only ever exercised by template
 * posts that no longer exist, and it pulls a large bibliography parser),
 * rehype-preset-minify (no measurable gain on prose), and remark-math /
 * rehype-katex — no post uses math, and the KaTeX stylesheet was never
 * imported, so maths rendered unstyled anyway. Reinstate the last pair
 * together with the stylesheet if an essay ever needs it.
 */
export default function Mdx({ source }: { source: string }) {
  return (
    <MDXRemote
      source={source}
      components={components}
      options={{
        mdxOptions: {
          remarkPlugins: [remarkGfm],
          rehypePlugins: [
            rehypeSlug,
            [rehypeAutolinkHeadings, { behavior: "append", test: ["h2", "h3"] }],
            [rehypePrismPlus, { defaultLanguage: "js", ignoreMissing: true }],
          ],
        },
      }}
    />
  );
}
