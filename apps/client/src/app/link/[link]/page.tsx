import { redirect } from "next/navigation";
import links from "../links.json";

export async function getStaticParams() {
  const paths = Object.keys(links).map((link) => ({ link }));
  return paths;
}

export default function Page({ params }: { params: { link: string } }) {
  redirect(links[params.link]);
}
