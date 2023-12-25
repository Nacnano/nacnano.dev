import Image from "next/image";
import { FC } from "react";

export const Logo: FC = () => {
  return (
    <>
      <div className="select-none items-center">
        <Image
          alt="nacnano-logo"
          src="/static/images/oong-oong-cropped.jpg"
          width={30}
          height={30}
          sizes="100vw"
        />
      </div>
    </>
  );
};
