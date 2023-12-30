import Image from "@/components/Image";
import { FC } from "react";

const Logo: FC = () => {
  return (
    <>
      <div className="select-none items-center">
        <Image
          alt="nacnano-logo"
          src="/static/images/oong-oong-cropped.jpg"
          width={50}
          height={50}
          sizes="100vw"
        />
      </div>
    </>
  );
};

export default Logo;
