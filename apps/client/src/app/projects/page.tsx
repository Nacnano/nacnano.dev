import projectsData from "@/data/projectsData";
import { genPageMetaData } from "../seo";

export const metadata = genPageMetaData({ title: "Projects" });

export default function Projects() {
  return (
    <>
      <div>
        <div>
          <h1>Projects</h1>
          <p>Some examples of projects I've done or contributed to</p>
        </div>
        <div>
          <div> {projectsData.map((project) => project.title)}</div>
        </div>
      </div>
    </>
  );
}
