import { notFound, redirect } from "next/navigation";
import links from "../links.json";

const table = links as Record<string, string>;

/** Prerendered so the redirector does not force a Node server for an
 *  otherwise fully static site. */
export function generateStaticParams() {
  return Object.keys(table).map((link) => ({ link }));
}

export const dynamicParams = false;

export default async function Page({
  params,
}: {
  params: Promise<{ link: string }>;
}) {
  const { link } = await params;
  const target = table[link];
  if (!target) notFound();
  redirect(target);
}
