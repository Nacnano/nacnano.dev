"use client";

import headerNavLinks from "@/data/headerNavLinks";
import CustomLink from "./Link";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

// How long the panel lingers in the DOM after a close, matching the fade-out
// duration on the overlay so closing glides rather than vanishing.
const EXIT_MS = 220;

const MobileNav = () => {
  const [open, setOpen] = useState(false);
  // `rendered` keeps the portal mounted through the exit fade; `shown` is the
  // "fully in" state the opacity class keys off, flipped a frame after open so
  // the browser paints the transparent state before transitioning to it. All
  // three flip from event handlers (never inside an effect) to avoid cascading
  // renders.
  const [rendered, setRendered] = useState(false);
  const [shown, setShown] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // A single unmount cleanup so a pending exit timer can never fire setRendered
  // after the component is gone.
  useEffect(
    () => () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    },
    []
  );

  const openMenu = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
    setRendered(true);
    setShown(false);
    requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)));
  }, []);

  const closeMenu = useCallback(() => {
    setOpen(false);
    setShown(false);
    // Honour the reader's motion preference: with no fade to wait for, drop the
    // panel immediately rather than holding a fully-transparent one.
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    closeTimer.current = setTimeout(() => setRendered(false), reduce ? 0 : EXIT_MS);
  }, []);

  // Move focus into the panel the moment it is on screen (it renders in the
  // same pass that flips `open`, so the ref is populated when this runs).
  useEffect(() => {
    if (!open) return;
    panelRef.current?.querySelector<HTMLElement>("button, a")?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMenu();
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
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, closeMenu]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label="Open menu"
        aria-expanded={open}
        onClick={openMenu}
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

      {/* The panel is removed from the DOM once its exit fade completes, so its
          links never sit in the tab order behind the page. It is portaled to
          <body>: the sticky header sets `backdrop-filter`, which would otherwise
          make the header a containing block for this `position: fixed` overlay
          and shrink it to the header's box instead of the viewport. */}
      {rendered &&
        createPortal(
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Site menu"
            className={`fixed inset-0 z-50 bg-white transition-opacity duration-200 ease-out sm:hidden dark:bg-zinc-950 ${
              shown ? "opacity-100" : "opacity-0"
            }`}
          >
            <div className="mx-auto flex h-full max-w-3xl flex-col px-5">
              <div className="flex justify-end py-5">
                <button
                  type="button"
                  aria-label="Close menu"
                  onClick={() => {
                    closeMenu();
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
                {headerNavLinks.map((link, i) => (
                  <CustomLink
                    key={link.title}
                    href={link.href}
                    onClick={closeMenu}
                    style={{ animationDelay: `${i * 45}ms` }}
                    className="animate-rise py-4 text-lg font-medium tracking-[-0.011em] text-zinc-900 dark:text-zinc-100"
                  >
                    {link.title}
                  </CustomLink>
                ))}
              </nav>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};

export default MobileNav;
