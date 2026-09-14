"use client";

import createGlobe from "cobe";
import { useEffect, useRef } from "react";
import type { VisitMarker } from "@/lib/activityTypes";

// The single accent, as 0–1 rgb, so the markers match the rest of the site
// rather than inventing a colour here.
const ACCENT: [number, number, number] = [37 / 255, 86 / 255, 218 / 255];

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true
  );
}

/**
 * A small WebGL globe with one marker per place this feed has seen lately.
 *
 * This is Brian Lovin's /activity centerpiece, ported to `cobe` (a ~6KB globe)
 * instead of three.js. It draws nothing until mounted, pauses its spin for
 * readers who ask for reduced motion, and follows the site's light/dark class.
 */
export default function ActivityGlobe({ markers }: { markers: VisitMarker[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const motion = prefersReducedMotion();
    let phi = 0;
    let frame = 0;
    let width = canvas.clientWidth || 320;

    const buffer = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.clientWidth || 320;
      const size = Math.floor(width * dpr);
      canvas.width = size;
      canvas.height = size;
      return size;
    };

    const dark = () => document.documentElement.classList.contains("dark") ? 1 : 0;

    let size = buffer();
    const globe = createGlobe(canvas, {
      devicePixelRatio: 2,
      width: size,
      height: size,
      phi: 0,
      theta: 0.35,
      dark: dark(),
      diffuse: 1.4,
      mapSamples: 14000,
      mapBrightness: dark() ? 5 : 1.2,
      baseColor: dark() ? [0.24, 0.24, 0.27] : [0.83, 0.84, 0.87],
      markerColor: ACCENT,
      glowColor: dark() ? [0.3, 0.45, 0.9] : [0.6, 0.7, 0.95],
      markers,
    });

    const onRender = () => {
      if (!motion) phi += 0.0035;
      const next = buffer();
      if (next !== size) size = next;
      globe.update({ phi, width: size, height: size });
      frame = requestAnimationFrame(onRender);
    };
    onRender();

    const themeObserver = new MutationObserver(() => {
      globe.update({ dark: dark(), mapBrightness: dark() ? 5 : 1.2 });
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    const resizeObserver = new ResizeObserver(() => {
      const next = buffer();
      size = next;
      globe.update({ width: size, height: size });
    });
    resizeObserver.observe(canvas);

    return () => {
      cancelAnimationFrame(frame);
      themeObserver.disconnect();
      resizeObserver.disconnect();
      globe.destroy();
    };
  }, [markers]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="h-full w-full"
    />
  );
}
