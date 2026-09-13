import Image from "@/components/Image";
import { FC } from "react";

const Logo: FC = () => (
  <Image
    src="/static/images/logo.png"
    alt=""
    aria-hidden="true"
    width={36}
    height={36}
    className="h-9 w-9 rounded object-cover"
    priority
  />
);

export default Logo;
