"use client";

import { useState } from "react";
import Link from "next/link";

type MenuLink = { href: string; label: string };

/** The header's links on small screens: a "Menu" button that opens a panel under the bar. */
export const MobileMenu = ({ links }: { links: MenuLink[] }) => {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <div
      className="md:hidden"
      onKeyDown={(event) => {
        if (event.key === "Escape") close();
      }}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls="mobile-menu"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-9 items-center rounded-md border border-brand-ink/15 px-3 font-medium text-brand-ink transition-colors hover:bg-brand-mist"
      >
        {open ? "Close" : "Menu"}
      </button>

      {open && (
        <nav
          id="mobile-menu"
          aria-label="Main"
          className="absolute inset-x-0 top-16 border-b border-brand-ink/10 bg-white shadow-[0_16px_24px_-20px_rgba(18,23,42,0.35)]"
        >
          <ul className="mx-auto flex w-full max-w-[1200px] flex-col px-5 py-2 sm:px-8">
            {links.map(({ href, label }) => {
              const className =
                "block border-b border-brand-ink/10 py-3.5 text-base text-brand-ink";
              return (
                <li key={href} className="last:[&>a]:border-b-0">
                  {href.startsWith("#") ? (
                    <a href={href} onClick={close} className={className}>
                      {label}
                    </a>
                  ) : (
                    <Link href={href} onClick={close} className={className}>
                      {label}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </div>
  );
};
