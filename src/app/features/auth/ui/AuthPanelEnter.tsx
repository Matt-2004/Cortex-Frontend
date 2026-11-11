"use client";

import { ReactNode, useLayoutEffect, useRef } from "react";

/* ────────────────────────────────────────────────────────────
 * Page-to-page slide for the auth form panel.
 *
 * <AuthLink direction="forward|back"> stores the direction just before
 * navigating; the next auth page's panel reads it on mount and plays a
 * CSS entrance (see .auth-enter-* in globals.css). A direct page load
 * or browser back/forward has no stored direction → no slide.
 * ──────────────────────────────────────────────────────────── */

const STORAGE_KEY = "cortex:auth-nav-direction";

export type AuthNavDirection = "forward" | "back";

export const rememberAuthNavDirection = (direction: AuthNavDirection) => {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, direction);
  } catch {
    // Storage blocked (private mode etc.) — just skip the animation.
  }
};

const takeAuthNavDirection = (): AuthNavDirection | null => {
  try {
    const value = window.sessionStorage.getItem(STORAGE_KEY);
    window.sessionStorage.removeItem(STORAGE_KEY);
    return value === "forward" || value === "back" ? value : null;
  } catch {
    return null;
  }
};

export const AuthPanelEnter = ({ children }: { children: ReactNode }) => {
  const ref = useRef<HTMLDivElement>(null);

  // Layout effect: apply the class before the first paint, so there's no
  // flash of un-animated content (and no SSR hydration mismatch).
  useLayoutEffect(() => {
    const direction = takeAuthNavDirection();
    const el = ref.current;
    if (!direction || !el) return;
    const className = `auth-enter-${direction}`;
    el.classList.add(className);
    const cleanup = () => el.classList.remove(className);
    el.addEventListener("animationend", cleanup, { once: true });
    return () => {
      el.removeEventListener("animationend", cleanup);
      cleanup();
    };
  }, []);

  return <div ref={ref}>{children}</div>;
};
