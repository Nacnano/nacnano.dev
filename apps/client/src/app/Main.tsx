import siteMetadata from "@/data/siteMetadata";
import Tag from "@/components/Tag";
import { formatDate } from "pliny/utils/formatDate";
import CustomLink from "@/components/Link";

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
            const { slug, date, title, summary, tags, readingTime } = post;
            return (
              <li key={slug} className="py-12">
                <article>
                  <div className="space-y-2 xl:grid xl:grid-cols-4 xl:items-baseline xl:space-y-0">
                    <dl className="flex flex-wrap items-center">
                      <dt className="sr-only">Published on</dt>
                      <dd className="text-base font-medium leading-6 text-gray-500 dark:text-gray-400">
                        <time className="text-lg mr-3" dateTime={date}>
                          {formatDate(date, siteMetadata.locale)}
                        </time>
                      </dd>
                      <span className="text-base text-gray-400 dark:text-gray-500">
                        {readingTime.text}
                      </span>
                    </dl>
                    <div className="space-y-5 xl:col-span-3">
                      <div className="space-y-6">
                        <div>
                          <h2 className="text-2xl font-bold leading-8 tracking-tight">
                            <CustomLink
                              href={`/blogs/${slug}`}
                              className="text-gray-900 dark:text-gray-100"
                            >
                              {title}
                            </CustomLink>
                          </h2>
                          <div className="flex flex-wrap">
                            {tags.map((tag) => (
                              <Tag key={tag} text={tag} />
                            ))}
                          </div>
                        </div>
                        <div>
                          <CustomLink
                            href={`/blogs/${slug}`}
                            className="prose max-w-none text-gray-500 dark:text-gray-400"
                          >
                            {summary}
                          </CustomLink>
                        </div>
                      </div>
                      <div className="text-base font-medium leading-6">
                        <CustomLink
                          href={`/blogs/${slug}`}
                          className="text-primary-500 hover:text-primary-600 dark:hover:text-primary-400"
                          aria-label={`Read more: "${title}"`}
                        >
                          Read more &rarr;
                        </CustomLink>
                      </div>
                    </div>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      </div>
      {posts.length > MAX_DISPLAY && (
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
