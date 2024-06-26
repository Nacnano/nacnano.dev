import links from "./links.json";
import CustomLink from "@/components/Link";

export default function Page() {
  return (
    <>
      <h1 className="flex flex-col justify-center items-center font-bold text-xl pb-5">
        All Links
      </h1>
      <div className="flex flex-row justify-center items-center flex-wrap gap-5 ">
        {links &&
          Object.entries(links).map(([key, link]) => (
            <CustomLink
              key={key}
              className="text-blue-300 text-lg hover:text-blue-600 "
              href={link}
            >
              {key}
            </CustomLink>
          ))}
      </div>
    </>
  );
}
