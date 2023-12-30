import Image from "@/components/Image";
import CustomLink from "@/components/Link";
import PageTitle from "@/components/PageTitle";
import SectionContainer from "@/components/SectionContainer";
import Tag from "@/components/Tag";
import siteMetadata from "@/data/siteMetadata";
import { Authors, Blog } from "contentlayer/generated";
import { CoreContent } from "pliny/utils/contentlayer";
import { ReactNode } from "react";

const postDateTemplate: Intl.DateTimeFormatOptions = {
  weekday: "long",
  year: "numeric",
  month: "long",
  day: "numeric",
};

interface Props {
  content: CoreContent<Blog>;
  authors: CoreContent<Authors>[];
  next?: { path: string; title: string };
  prev?: { path: string; title: string };
  children: ReactNode;
}
export default function BlogWithDetail({
  content,
  authors,
  next,
  prev,
  children,
}: Props) {
  const { filePath, path, slug, date, title, tags } = content;
  const basePath = filePath.split("/")[0];

  return (
    <>
      <SectionContainer>
        <article>
          <div className="xl:divide-y xl:divide-gray-200 xl:dark:divide-gray-700">
            <header className="pt-6 xl:pb-6">
              <div className="space-y-1 text-center">
                <dl className="space-y-10">
                  <div>
                    <dt className="sr-only">Published On </dt>
                    <dd className="text-base font-medium leading-6 text-gray-500 dark:text-gray-400">
                      <time dateTime={date}>
                        {new Date(date).toLocaleDateString(
                          siteMetadata.locale,
                          postDateTemplate
                        )}
                      </time>
                    </dd>
                  </div>
                </dl>
                <div>
                  <PageTitle>{title}</PageTitle>
                </div>
              </div>
            </header>
            <div className="grid-rows-[auto_1fr] divide-y divide-gray-200 pb-8 dark:divide-gray-700 xl:grid xl:grid-cols-4 xl:gap-x-6 xl:divide-y-0">
              <dl className="pb-10 pt-6 xl:border-b xl:border-gray-200 xl:pt-11 xl:dark:border-gray-700">
                <dt className="sr-only">Authors</dt>
                <dd className="flex flex-wrap justify-center gap-4 sm:space-x-12 xl:block xl:space-x-0 xl:space-y-8">
                  <ul>
                    {authors.map((author) => (
                      <li
                        key={author.name}
                        className="flex items-center space-x-2"
                      >
                        {author.avatar && (
                          <Image
                            src={author.avatar}
                            width={38}
                            height={38}
                            alt="avatar"
                            className="h-10 w-10 rounded-full"
                          />
                        )}
                        <dl className="whitespace-nowrap text-sm font-medium leading-5">
                          <dt className="sr-only">Name</dt>
                          <dd className="text-gray-900 dark:text-gray-100">
                            {author.name}
                          </dd>
                          <dt className="sr-only">Twitter</dt>
                          <dd className="text-primary-500 hover:text-primary-600 dark:hover:text-primary-400">
                            {author.twitter && (
                              <CustomLink href={author.twitter}>
                                {author.twitter.replace(
                                  "https://twitter.com/",
                                  "@"
                                )}
                              </CustomLink>
                            )}
                          </dd>
                        </dl>
                      </li>
                    ))}
                  </ul>
                </dd>
              </dl>
              <div className="divide-y divide-gray-200 dark:divide-gray-700 xl:col-span-3 xl:row-span-2 xl:pb-0">
                <div className="prose max-w-none pb-8 pt-10 dark:prose-invert">
                  {children}
                </div>
                <div className="pb-6 pt-6 text-sm text-gray-700 dark:text-gray-300">
                  <CustomLink href="twitter.com/TODO" rel="nofollow">
                    Discuss on Twitter
                  </CustomLink>
                  {` • `}
                  <CustomLink href="github.com/TODO">View on GitHub</CustomLink>
                </div>
                {/* TODO: Add Comment section */}
              </div>
              <footer>
                <div className="divide-gray-200 text-sm font-medium leading-5 dark:divide-gray-700 xl:col-start-1 xl:row-start-2 xl:divide-y">
                  {tags && (
                    <div className="py-4 xl:py-8">
                      <h2 className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        Tags
                      </h2>
                      <div className="flex flex-wrap">
                        {tags.map((tag) => (
                          <Tag key={tag} text={tag} />
                        ))}
                      </div>
                    </div>
                  )}
                  {(next || prev) && (
                    <div className="flex justify-between py-4 xl:block xl:space-y-8 xl:py-8">
                      {prev && prev.path && (
                        <div>
                          <h2 className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                            Previous blog
                          </h2>
                          <div className="text-primary-500 hover:text-primary-600 dark:hover:text-primary-400">
                            <CustomLink href={`/${prev.path}`}>
                              {prev.title}
                            </CustomLink>
                          </div>
                        </div>
                      )}
                      {next && next.path && (
                        <div>
                          <h2 className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                            Next blog
                          </h2>
                          <div className="text-primary-500 hover:text-primary-600 dark:hover:text-primary-400">
                            <CustomLink href={`/${next.path}`}>
                              {next.title}
                            </CustomLink>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="pt-4 xl:pt-8">
                  <CustomLink
                    href={`/${basePath}`}
                    aria-label="Back to Blogs Page"
                    className="text-primary-500 hover:text-primary-600 dark:hover:text-primary-400"
                  >
                    &larr; Back to the Blogs page
                  </CustomLink>
                </div>
              </footer>
            </div>
          </div>
        </article>
      </SectionContainer>
    </>
  );
}
