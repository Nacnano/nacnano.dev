import { siteMetaData } from "@/data/siteMetaData";
import Link from "next/link";
import { Logo } from "./Logo";

export default function Header() {
  return (
    <header className="flex items-center justify-between py-10">
      <div>
        <Link href="/" aria-label={siteMetaData.headerTitle}>
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
    </header>
  );
}
