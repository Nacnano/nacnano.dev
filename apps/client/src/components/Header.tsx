import { siteMetaData } from "@/data/siteMetaData";
import Link from "next/link";
import { Logo } from "./Logo";

export default function Header() {
  return (
    <header className="">
      <div>
        <Link href="/" aria-label={siteMetaData.headerTitle}>
          <div>
            <div>
              <Logo />
            </div>
            {typeof siteMetaData.headerTitle === "string" ? (
              <div className="">{siteMetaData.headerTitle}</div>
            ) : (
              siteMetaData.headerTitle
            )}
          </div>
        </Link>
      </div>
    </header>
  );
}
