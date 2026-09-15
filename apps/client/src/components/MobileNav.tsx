"use client";

import headerNavLinks from "@/data/headerNavLinks";
import CustomLink from "./Link";
import { useEffect, useRef, useState } from "react";

const MobileNav = () => {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
        "a[href], button:not([disabled])"
      );
      if (!focusable?.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      // Nothing to trap — an empty panel lets the browser handle Tab normally.
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    panelRef.current?.querySelector<HTMLElement>("button, a")?.focus();
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label="Open menu"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="-mr-2 flex h-11 w-11 items-center justify-center rounded text-zinc-700 hover:text-zinc-900 sm:hidden dark:text-zinc-300 dark:hover:text-zinc-100"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          className="h-5 w-5"
          aria-hidden="true"
        >
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </button>

      {/* The closed panel is removed from the DOM, so its links never sit in
          the tab order behind the page. */}
      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label="Site menu"
          className="fixed inset-0 z-50 bg-white sm:hidden dark:bg-zinc-950"
        >
          <div className="mx-auto flex h-full max-w-3xl flex-col px-5">
            <div className="flex justify-end py-5">
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => {
                  setOpen(false);
                  triggerRef.current?.focus();
                }}
                className="-mr-2 flex h-11 w-11 items-center justify-center rounded text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  className="h-5 w-5"
                  aria-hidden="true"
                >
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
            <nav className="flex flex-col divide-y divide-zinc-200 dark:divide-zinc-800">
              {headerNavLinks.map((link) => (
                <CustomLink
                  key={link.title}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="py-4 text-lg font-medium tracking-[-0.011em] text-zinc-900 dark:text-zinc-100"
                >
                  {link.title}
                </CustomLink>
              ))}
            </nav>
          </div>
        </div>
      )}
    </>
  );
};

export default MobileNav;
