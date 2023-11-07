import Image from "next/image";
import { FC } from "react";

export const Logo: FC = () => {
  return (
    <>
      <div className="select-none">
        <Image
          alt="nacnano-logo"
          src="/images/oong-oong-cropped.jpg"
          width={0}
          height={0}
          sizes="100vw"
          // style={{ width: "100%", height: "auto" }}
        />
        <span className="text-gray-400"> Nacnano </span>
      </div>
    </>
  );
};
