import { Logo } from "@/components/Logo";
import Link from "next/link";
import { FC } from "react";
import { FacebookButton } from "@/components/buttons";

export const NavigationBar: FC = () => {
  return (
    <>
      <div className="hidden flex-col bg-gray-900 md:flex justify-between border-gray-500">
        <div className="flex space-x-10 items-center">
          <Link href="/">
            <div className="flex items-center cursor-pointer ">
              <Logo />
            </div>
          </Link>
          <Link href="/me">
            <span className="text-gray select-none cursor-pointer"> Me </span>
          </Link>
          <Link href="/blog">Blogs</Link>
        </div>
        <div className="flex space-x-6">
          <FacebookButton />
        </div>
      </div>
    </>
  );
};
