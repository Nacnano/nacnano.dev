import Main from "@/app/Main";
import { publishedBlogs } from "@/lib/content";

export default function Page() {
  return <Main posts={publishedBlogs()} />;
}
