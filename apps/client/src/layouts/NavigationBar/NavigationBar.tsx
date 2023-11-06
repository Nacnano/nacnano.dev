import Link from "next/link";
import { FC } from "react";

export const NavigationBar: FC = () => {
  return (
    <>
      <nav>
        <div>
          <Link href="/">
            <div>
              <Logo />
            </div>
          </Link>
        </div>
      </nav>
    </>
  );
};
