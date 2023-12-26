import siteMetadata from "@/data/siteMetadata";
import Link from "./Link";

const Footer = () => {
  return (
    <footer>
      <div className="flex flex-col mt-16 items-center">
        <div className="mb-2 flex space-x-2 text-sm text-gray-500 dark:text-gray-400">
          <div>{siteMetadata.author}</div>
          <div>{` • `}</div>
          <div>{`© ${new Date().getFullYear()}`}</div>
          <div>{` • `}</div>
          <Link href="/">{siteMetadata.title}</Link>
        </div>
        <div className="mb-80 text-sm text-gray-500 dark:text-gray-400">
          Based on{" "}
          <Link href="https://github.com/timlrx/tailwind-nextjs-starter-blog">
            Tailwind Nextjs Theme
          </Link>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
