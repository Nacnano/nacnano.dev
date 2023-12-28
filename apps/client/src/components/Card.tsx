import Image from "@/components/Image";
import CustomLink from "@/components/Link";

const Card = ({ title, description, imgSrc, href }) => {
  return (
    <>
      <div className="md max-w-[544px] p-4 md:w-1/2">
        <div
          className={`${
            imgSrc && "h-full"
          }  overflow-hidden rounded-md border-2 border-gray-200 border-opacity-60 dark:border-gray-700`}
        >
          {imgSrc &&
            (href ? (
              <CustomLink
                href={href}
                aria-label={`Link to ${title}`}
                className="object-cover object-center md:h-36 lg:h-48"
              >
                <Image src={imgSrc} alt={title} width={544} height={306} />
              </CustomLink>
            ) : (
              <Image
                src={imgSrc}
                alt={title}
                width={544}
                height={306}
                className="object-cover object-center md:h-36 lg:h-48"
              />
            ))}
          <div className="p-6">
            <h2 className="mb-3 text-2xl font-bold leading-8 tracking-tight">
              {href ? (
                <CustomLink href={href} aria-label={`Link to ${title}`}>
                  {title}
                </CustomLink>
              ) : (
                title
              )}
            </h2>
            <p className="prose dark:prose-invert mb-3 max-w-none text-gray-500 dark:text-gray-400">
              {description}
            </p>
            {href && (
              <CustomLink
                href={href}
                aria-label={`Link to ${title}`}
                className="text-base font-medium leading-6 text-primary-500 hover:text-primary-600 dark:hover:text-primary-400"
              >
                Learn more &rarr;
              </CustomLink>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Card;
