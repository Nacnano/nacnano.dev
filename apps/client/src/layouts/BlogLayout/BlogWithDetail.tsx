import Image from "@/components/Image";
import CustomLink from "@/components/Link";
import PageTitle from "@/components/PageTitle";
import SectionContainer from "@/components/SectionContainer";
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
          <header>
            <div>
              <dl>
                <div>
                  <dt className="sr-only">Published On </dt>
                  <dd>
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
          <div>
            <dl>
              <dt className="sr-only">Authors</dt>
              <dd>
                <ul>
                  {authors.map((author) => (
                    <li key={author.name}>
                      {author.avatar && (
                        <Image
                          src={author.avatar}
                          width={38}
                          height={38}
                          alt="avatar"
                          className="h-10 w-10 rounded-full"
                        />
                      )}
                      <dl>
                        <dt className="sr-only">Name</dt>
                        <dd>{author.name}</dd>
                        <dt className="sr-only">Twitter</dt>
                        <dd>
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
            <div>
              <div> {children}</div>
              <div>
                {/* TODO: <CustomLink href=""></CustomLink> */}
                <CustomLink href="github.com/TODO"> View on GitHub</CustomLink>
              </div>
              {/* TODO: Add Comment section */}
            </div>
          </div>
        </article>
      </SectionContainer>
    </>
  );
}
