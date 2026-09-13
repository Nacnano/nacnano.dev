import { notFound, redirect } from "next/navigation";
import links from "../links.json";

export default function Page({ params }: { params: { link: string } }) {
  const target = (links as Record<string, string>)[params.link];
  if (!target) notFound();
  redirect(target);
}
