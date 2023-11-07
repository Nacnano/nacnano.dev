import { Logo } from "@/components/Logo";
import Link from "next/link";
import { FC } from "react";
import { FacebookButton } from "@/components/buttons";

export const NavigationBar: FC = () => {
  return (
    <>
      <nav className="hidden bg-gray-900 md:flex justify-between border-gray-500">
        <div className="flex space-x-10 items-baseline">
          <Link href="/">
            <div className=" flex items-center cursor-pointer ">
              <Logo />
            </div>
          </Link>
          <Link href="/me" className="text-gray select-none cursor-pointer">
            <div> Me</div>
          </Link>
          <Link href="/blog">
            <div> Blogs</div>
          </Link>
          <Link href="/projects">
            <div> Projects</div>
          </Link>
        </div>
        <div className="flex space-x-6">
          <FacebookButton />
        </div>
      </nav>
    </>
  );
};
