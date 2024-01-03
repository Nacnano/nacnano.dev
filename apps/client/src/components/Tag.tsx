import slug from "github-slugger";
import CustomLink from "./Link";

interface Props {
  text: string;
}

const Tag = ({ text }: Props) => {
  return (
    <CustomLink
      href={`/tags/${slug(text)}`}
      className="mr-3 text-sm font-medium uppercase text-primary-500 hover:text-primary-600 dark:hover:text-primary-400"
    >
      {text.split(" ").join("-")}
    </CustomLink>
  );
};

export default Tag;
