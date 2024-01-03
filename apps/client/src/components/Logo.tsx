import Image from "@/components/Image";
import { FC } from "react";

const Logo: FC = () => {
  const title = "nacnano-logo";
  const imgSrc = "/static/images/oong-oong-cropped.jpg";
  return (
    <>
      <div className="select-none items-center">
        <Image
          alt={title}
          src={imgSrc}
          placeholder="blur"
          blurDataURL={imgSrc}
          width="0"
          height="0"
          sizes="100vw"
          className="w-auto h-12"
        />
      </div>
    </>
  );
};

export default Logo;
