import { siteMetaData } from "@/data/siteMetaData";
import Link from "next/link";
import { Logo } from "./Logo";
import headerNavLinks from "@/data/headerNavLinks";

export default function Header() {
  return (
    <header className="flex items-center justify-between py-10">
      <div>
        <Link
          href="/"
          aria-label={siteMetaData.headerTitle}
          style={{ textDecoration: "none" }}
        >
          <div className="flex items-center justify-between">
            <div className="mr-3">
              <Logo />
            </div>
            {typeof siteMetaData.headerTitle === "string" ? (
              <div className="hidden h-6 text-2xl font-semibold sm:block">
                {siteMetaData.headerTitle}
              </div>
            ) : (
              siteMetaData.headerTitle
            )}
          </div>
        </Link>
      </div>
      <div className="flex items-center space-x-4 leading-5">
        {headerNavLinks
          .filter((link) => link.href !== "/")
          .map((link) => (
            <Link
              style={{ textDecoration: "none" }}
              key={link.title}
              href={link.href}
              className="hidden font-medium text-gray-900 dark:text-gray-100 sm:block"
            >
              {link.title}
            </Link>
          ))}
      </div>
    </header>
  );
}
