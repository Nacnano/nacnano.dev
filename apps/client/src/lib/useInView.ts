"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Reports once an element first scrolls into (or near) the viewport, then stays
 * `true`. Used to defer expensive below-the-fold client work — mounting the
 * WebGL globe (and therefore fetching its `cobe` chunk) only when a reader could
 * actually see it, instead of on first paint.
 *
 * The observed element is reserved by a sized placeholder by the caller, so
 * flipping to `true` never causes layout shift. Once seen we disconnect — it is
 * a one-way latch, not a continuous visibility tracker (the globe keeps running
 * once loaded, so we do not want to tear it down on scroll-away).
 *
 * Hydration-safe: `inView` is `false` on the server and the first client paint,
 * so both renders match; the observer only attaches post-mount.
 */
export function useInView<T extends Element>(
  rootMargin = "200px 0px"
): readonly [React.RefObject<T | null>, boolean] {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || inView) return;
    // No IntersectionObserver (e.g. a non-DOM environment): show eagerly.
    if (typeof IntersectionObserver === "undefined") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      (records) => {
        if (records.some((record) => record.isIntersecting)) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [inView, rootMargin]);

  return [ref, inView] as const;
}
