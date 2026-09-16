"use client";

import { usePathname } from "next/navigation";
import siteMetadata from "@/data/siteMetadata";
import headerNavLinks from "@/data/headerNavLinks";
import Logo from "@/components/Logo";
import ThemeSwitch from "@/components/ThemeSwitch";
import CustomLink from "@/components/Link";
import MobileNav from "./MobileNav";

// Essays live under /blogs/<slug> but belong to the Writing section, so the
// home link owns them too.
const isActive = (pathname: string, href: string) =>
  href === "/"
    ? pathname === "/" || pathname.startsWith("/blogs")
    : pathname.startsWith(href);

const Header = () => {
  const pathname = usePathname() ?? "/";

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between gap-4 border-b border-zinc-200 bg-white py-3 backdrop-blur supports-[backdrop-filter]:bg-white/85 dark:border-zinc-800 dark:bg-zinc-950 dark:supports-[backdrop-filter]:bg-zinc-950/85">
      <CustomLink
        href="/"
        className="group flex items-center gap-2.5 rounded"
        aria-label={`${siteMetadata.author} — home`}
      >
        <Logo />
        <span className="text-[0.9375rem] font-semibold tracking-[-0.011em] text-zinc-900 dark:text-zinc-100">
          {siteMetadata.shortName}
        </span>
      </CustomLink>

      <div className="flex items-center gap-1">
        <nav className="hidden sm:flex sm:items-center sm:gap-1">
          {headerNavLinks.map((link) => {
            const active = !link.external && isActive(pathname, link.href);
            return (
              <CustomLink
                key={link.title}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`rounded px-2.5 py-2 text-sm transition-colors ${
                  active
                    ? "text-accent-600 dark:text-accent-300 font-medium"
                    : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                }`}
              >
                {link.title}
              </CustomLink>
            );
          })}
        </nav>
        <ThemeSwitch />
        <MobileNav />
      </div>
    </header>
  );
};

export default Header;
