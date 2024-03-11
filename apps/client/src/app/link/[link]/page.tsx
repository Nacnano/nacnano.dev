import { redirect } from "next/navigation";
import links from "../links.json";

export default function Page({ params }: { params: { link: string } }) {
  redirect(links[params.link]);
}
