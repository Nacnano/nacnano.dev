import Image from "next/image";
import { FC } from "react";

export const Logo: FC = () => {
  return (
    <>
      <div className="">
        <Image
          alt="nacnano-logo"
          src="/images/oong-oong-cropped.jpg"
          fill={true}
        />
        <span className="text-gray-400"> Nacnano </span>
      </div>
    </>
  );
};
