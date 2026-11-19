import Link from "next/link";
import { PAGE_LINKS, SECTION_LINKS } from "./navLinks";
import { Brand, Container } from "./primitives";

const LINKS = [...SECTION_LINKS, ...PAGE_LINKS];

export const SiteFooter = () => (
  <footer className="border-t border-brand-ink/10 bg-white">
    <Container className="flex flex-col gap-8 py-12 md:flex-row md:items-center md:justify-between">
      <div>
        <Brand />
        <p className="mt-2 text-sm text-brand-ink-muted">
          The AI assistant for your website.
        </p>
      </div>
      <nav aria-label="Footer">
        <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-brand-ink-muted">
          {LINKS.map(({ href, label }) => (
            <li key={href}>
              {href.startsWith("#") ? (
                <a
                  href={href}
                  className="transition-colors hover:text-brand-ink"
                >
                  {label}
                </a>
              ) : (
                <Link
                  href={href}
                  className="transition-colors hover:text-brand-ink"
                >
                  {label}
                </Link>
              )}
            </li>
          ))}
        </ul>
      </nav>
      <p className="font-receipt text-xs text-brand-ink-muted">© Cortex</p>
    </Container>
  </footer>
);
