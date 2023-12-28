import Image from "./Image";
import CustomLink from "./Link";

const Card = ({ title, description, imgSrc, href }) => {
  return (
    <>
      <div>
        <div>
          {imgSrc &&
            (href ? (
              <CustomLink href={href} aria-label={`Link to ${title}`}>
                <Image src={imgSrc} alt={title} width={544} height={306} />
              </CustomLink>
            ) : (
              <Image src={imgSrc} alt={title} width={544} height={306} />
            ))}
          <div>
            <h2> {title}</h2>
            <p>{description}</p>
            {href && (
              <CustomLink href={href} aria-label={`Link to ${title}`}>
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
