import { formatDate } from "pliny/utils/formatDate";
import CustomLink from "./Link";
import siteMetadata from "@/data/siteMetadata";
import Tag from "./Tag";
import { Blog } from "contentlayer/generated";

interface BlogCardPropsType {
  post: Blog;
}

export default function BlogCard({ post }: BlogCardPropsType) {
  const { slug, date, title, summary, tags, readingTime } = post;

  return (
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
  );
}
