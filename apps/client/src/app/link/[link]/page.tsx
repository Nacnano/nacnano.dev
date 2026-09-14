import { notFound, redirect } from "next/navigation";
import links from "../links.json";

const table = links as Record<string, string>;

/** Prerendered so the redirector does not force a Node server for an
 *  otherwise fully static site. */
export function generateStaticParams() {
  return Object.keys(table).map((link) => ({ link }));
}

export const dynamicParams = false;

export default function Page({ params }: { params: { link: string } }) {
  const target = table[params.link];
  if (!target) notFound();
  redirect(target);
}
