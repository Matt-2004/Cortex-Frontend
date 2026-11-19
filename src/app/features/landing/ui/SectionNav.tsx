"use client";

import { useEffect, useState } from "react";
import { clsx } from "clsx";

type NavLink = { href: `#${string}`; label: string };

/**
 * The header's section links. The one whose section you are reading is
 * marked, so the bar that follows you down the page also says where you are.
 * A link stays current until the next linked section arrives: "Features"
 * covers the feature sections that have no link of their own.
 */
export const SectionNav = ({ links }: { links: NavLink[] }) => {
  const [current, setCurrent] = useState<string | null>(null);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      // A section counts once its top has passed 40% of the way down.
      const line = window.innerHeight * 0.4;
      let found: string | null = null;
      for (const { href } of links) {
        const section = document.getElementById(href.slice(1));
        if (section && section.getBoundingClientRect().top <= line) {
          found = href;
        }
      }
      setCurrent(found);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [links]);

  return (
    <nav aria-label="Main" className="hidden lg:block">
      <ul className="flex items-center gap-5 xl:gap-6">
        {links.map(({ href, label }) => {
          const active = current === href;
          return (
            <li key={href}>
              <a
                href={href}
                aria-current={active ? "location" : undefined}
                className={clsx(
                  "relative inline-flex h-16 items-center transition-colors duration-150 hover:text-brand-ink",
                  // The bar sits on the header's bottom edge.
                  "after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-brand-teal after:transition-opacity after:duration-150",
                  active
                    ? "text-brand-ink after:opacity-100"
                    : "text-brand-ink-muted after:opacity-0",
                )}
              >
                {label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};
