"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { clsx } from "clsx";

/**
 * Its children rise into place, one after the other, the first time the
 * block scrolls into view (`.reveal` in globals.css).
 *
 * Nothing is hidden unless this script has run and the block is still below
 * the screen: without JavaScript, under reduced motion, or when the block is
 * already visible on load, the children simply stand where they are.
 */
export const Reveal = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (node.getBoundingClientRect().top < window.innerHeight * 0.9) return;

    node.dataset.reveal = "wait";
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        node.dataset.reveal = "in";
        observer.disconnect();
      },
      // A little way in, so the motion happens on screen, not at its edge.
      { rootMargin: "0px 0px -12% 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={clsx("reveal", className)}>
      {children}
    </div>
  );
};
