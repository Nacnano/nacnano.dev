"use client";

import createGlobe from "cobe";
import type { Globe } from "cobe";
import { useEffect, useRef } from "react";
import type { VisitMarker } from "@/lib/activityTypes";

// The single accent, as 0–1 rgb, so the markers match the rest of the site
// rather than inventing a colour here.
const ACCENT: [number, number, number] = [37 / 255, 86 / 255, 218 / 255];

const AUTO_SPIN = 0.0032; // radians advanced per frame
const DRAG_SENSITIVITY = 0.005;
const THETA_MIN = -1.2;
const THETA_MAX = 1.2;

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true
  );
}

/**
 * A small WebGL globe with one marker per place this feed has seen lately.
 *
 * Ported from brianlovin.com/activity using `cobe` (a ~6KB globe) rather than
 * three.js. Design notes that are easy to get wrong:
 *
 * - The globe is created once and lives for the component's life. Polls hand in
 *   a new markers array every couple of seconds; those are pushed through
 *   `globe.update`, NOT by re-running the creation effect — recreating it would
 *   reset the rotation and make the globe "respins" on every refresh.
 * - The spin is a plain requestAnimationFrame loop advancing an angle held in a
 *   ref, so it is continuous and survives re-renders and marker updates.
 * - A reader can drag to spin it by hand: pointer motion drives the same refs
 *   the loop reads, and auto-spin simply pauses while dragging.
 * - It respects prefers-reduced-motion by not auto-spinning (manual drag still
 *   works, since that is user-initiated) and follows the site's light/dark class.
 */
export default function ActivityGlobe({ markers }: { markers: VisitMarker[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const globeRef = useRef<Globe | null>(null);
  const phiRef = useRef(0);
  const thetaRef = useRef(0.35);
  const markersRef = useRef<VisitMarker[]>(markers);
  const sizeRef = useRef(0);
  const draggingRef = useRef(false);
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null);

  // Keep the newest markers for the loop to pick up; never re-create the globe.
  useEffect(() => {
    markersRef.current = markers;
    globeRef.current?.update({ markers });
  }, [markers]);

  // Create the globe and drive the render loop. Empty deps: this runs once.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const reduced = prefersReducedMotion();

    const applySize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = canvas.clientWidth || 320;
      const size = Math.floor(width * dpr);
      canvas.width = size;
      canvas.height = size;
      sizeRef.current = size;
      return size;
    };

    const isDark = () => document.documentElement.classList.contains("dark");
    const themeColors = () => ({
      dark: isDark() ? 1 : 0,
      mapBrightness: isDark() ? 5 : 1.2,
      baseColor: (isDark() ? [0.24, 0.24, 0.27] : [0.83, 0.84, 0.87]) as [
        number,
        number,
        number,
      ],
      glowColor: (isDark() ? [0.3, 0.45, 0.9] : [0.6, 0.7, 0.95]) as [
        number,
        number,
        number,
      ],
    });

    const size = applySize();
    const globe = createGlobe(canvas, {
      devicePixelRatio: 2,
      width: size,
      height: size,
      phi: phiRef.current,
      theta: thetaRef.current,
      diffuse: 1.4,
      mapSamples: 14000,
      markerColor: ACCENT,
      markers: markersRef.current,
      ...themeColors(),
    });
    globeRef.current = globe;

    let frame = 0;
    const onRender = () => {
      if (!draggingRef.current && !reduced) phiRef.current += AUTO_SPIN;
      globe.update({
        phi: phiRef.current,
        theta: thetaRef.current,
        width: sizeRef.current,
        height: sizeRef.current,
      });
      frame = requestAnimationFrame(onRender);
    };
    onRender();

    const themeObserver = new MutationObserver(() => globe.update(themeColors()));
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    const resizeObserver = new ResizeObserver(() => {
      applySize();
      globe.update({ width: sizeRef.current, height: sizeRef.current });
    });
    resizeObserver.observe(canvas);

    return () => {
      cancelAnimationFrame(frame);
      themeObserver.disconnect();
      resizeObserver.disconnect();
      globe.destroy();
      globeRef.current = null;
    };
  }, []);

  // Drag to spin. Using pointer events so it works with mouse and touch.
  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    draggingRef.current = true;
    lastPointerRef.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!draggingRef.current) return;
    const last = lastPointerRef.current;
    if (!last) return;
    const dx = e.clientX - last.x;
    const dy = e.clientY - last.y;
    lastPointerRef.current = { x: e.clientX, y: e.clientY };
    phiRef.current += dx * DRAG_SENSITIVITY;
    const nextTheta = thetaRef.current + dy * DRAG_SENSITIVITY;
    thetaRef.current = Math.min(THETA_MAX, Math.max(THETA_MIN, nextTheta));
  };

  const endDrag = (e: React.PointerEvent<HTMLCanvasElement>) => {
    draggingRef.current = false;
    lastPointerRef.current = null;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
  };

  return (
    // A canvas with no tabIndex is not keyboard-focusable — the pointer handlers
    // are a drag affordance, not a focus target — so the rule misreads this.
    // Dropping aria-hidden would expose an unlabelled canvas to a screen reader.
    // biome-ignore lint/a11y/noAriaHiddenOnFocusable: decorative canvas, not focusable
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerLeave={endDrag}
      onPointerCancel={endDrag}
      className="h-full w-full cursor-grab touch-none select-none active:cursor-grabbing"
    />
  );
}
