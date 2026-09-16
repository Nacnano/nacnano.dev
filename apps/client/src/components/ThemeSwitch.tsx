"use client";

import { useRef } from "react";
import { flushSync } from "react-dom";
import { useTheme } from "next-themes";
import { useMounted } from "@/lib/useMounted";

type ViewTransitionDocument = Document & {
  startViewTransition?: (callback: () => void) => unknown;
};

// Origin and radius for the circular reveal, expressed as CSS custom
// properties the keyframe in tailwind.css reads off the root.
function setRevealOrigin(root: HTMLElement, x: number, y: number) {
  const { clientWidth: w, clientHeight: h } = document.documentElement;
  const farthest = Math.hypot(Math.max(x, w - x), Math.max(y, h - y));
  root.style.setProperty("--vt-x", `${x}px`);
  root.style.setProperty("--vt-y", `${y}px`);
  root.style.setProperty("--vt-r", `${Math.ceil(farthest)}px`);
}

const ThemeSwitch = () => {
  const { setTheme, resolvedTheme } = useTheme();
  const mounted = useMounted();
  const buttonRef = useRef<HTMLButtonElement>(null);

  const isDark = mounted && resolvedTheme === "dark";
  // Before mount the resolved theme is unknown, so the control stays
  // unlabelled-by-state rather than claiming the wrong one.
  const label = !mounted
    ? "Toggle theme"
    : isDark
      ? "Switch to light theme"
      : "Switch to dark theme";

  const handleClick = () => {
    const next = isDark ? "light" : "dark";
    const doc = document as ViewTransitionDocument;
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    // No View Transitions (or a reader who opted out of motion): swap instantly.
    if (typeof doc.startViewTransition !== "function" || reduceMotion) {
      setTheme(next);
      return;
    }

    // Anchor the reveal on the icon's center so the new theme radiates from the
    // toggle the reader just pressed.
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) {
      setRevealOrigin(
        doc.documentElement,
        rect.left + rect.width / 2,
        rect.top + rect.height / 2
      );
    }

    // next-themes mutates <html> through React state, so commit it inside the
    // transition with flushSync; otherwise the snapshot races the repaint.
    doc.startViewTransition(() => {
      flushSync(() => setTheme(next));
    });
  };

  return (
    <button
      ref={buttonRef}
      type="button"
      aria-label={label}
      title={label}
      onClick={handleClick}
      className="flex h-11 w-11 items-center justify-center rounded text-zinc-700 transition-colors hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-[1.125rem] w-[1.125rem]"
        aria-hidden="true"
      >
        {isDark ? (
          <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
          </>
        ) : (
          <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z" />
        )}
      </svg>
    </button>
  );
};

export default ThemeSwitch;
