/**
 * Smooth-scroll the window to the top, opting out of motion for readers who
 * ask us to. The reduced-motion block in tailwind.css only reaches the CSS
 * `scroll-behavior`; a JS `behavior: "smooth"` overrides it, so the promise
 * that no motion ships uncovered is honoured here.
 */
export function scrollToTop() {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
}
