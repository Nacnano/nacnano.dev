"use client";

import { useEffect, useState } from "react";

/**
 * Post-mount flag for hydration guards. `false` during the server pass and the
 * first client paint, `true` after mount — so time- or theme-dependent UI can
 * render a stable value first and never mismatch between server and client.
 *
 * Centralised here so the one legitimate "setState in an effect" (the flag can
 * only exist after mount) is suppressed once, not copy-pasted per component.
 */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);
  return mounted;
}