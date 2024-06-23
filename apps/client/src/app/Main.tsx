import siteMetadata from "@/data/siteMetadata";
import CustomLink from "@/components/Link";
import BlogCard from "@/components/BlogCard";

const MAX_DISPLAY = 5;

const Main = ({ posts }) => {
  return (
    <>
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        <div className="space-y-2 pb-8 pt-6 md:space-y-5">
          <h1 className="text-3xl font-extrabold leading-9 tracking-tight text-gray-900 dark:text-gray-100 sm:text-4xl sm:leading-10 md:text-6xl md:leading-14">
            Latest
          </h1>
          <p className="text-lg leading-7 text-gray-500 dark:text-gray-400">
            {siteMetadata.description}
          </p>
        </div>
        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
          {!posts.length && "No posts found."}
          {posts.slice(0, MAX_DISPLAY).map((post) => {
            const { slug } = post;
            return (
              <li key={slug} className="py-12">
                <BlogCard post={post} />
              </li>
            );
          })}
        </ul>
      </div>
      {posts.length > 1 && (
        <div className="flex justify-end text-base font-medium leading-6">
          <CustomLink
            href="/blogs"
            className="text-primary-500 hover:text-primary-600 dark:hover:text-primary-400"
            aria-label="All Blogs"
          >
            All Blogs &rarr;
          </CustomLink>
        </div>
      )}
      {/* TODO: Add Newsletter */}
    </>
  );
};

export default Main;
