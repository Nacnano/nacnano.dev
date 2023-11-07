import Image from "next/image";
import { FC } from "react";

export const Logo: FC = () => {
  return (
    <>
      <div className="select-none items-center">
        <Image
          alt="nacnano-logo"
          src="/images/oong-oong-cropped.jpg"
          width={30}
          height={30}
          sizes="100vw"
        />
        <span className="text-gray-400"> Nacnano </span>
      </div>
    </>
  );
};
