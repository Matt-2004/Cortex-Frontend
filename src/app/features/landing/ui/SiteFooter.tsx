import Link from "next/link";
import { Brand, Container } from "./primitives";

const LINKS = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
  { href: "/auth/login", label: "Sign in" },
];

export const SiteFooter = () => (
  <footer className="border-t border-brand-ink/10 bg-white">
    <Container className="flex flex-col gap-8 py-12 md:flex-row md:items-center md:justify-between">
      <div>
        <Brand />
        <p className="mt-2 text-sm text-[#4B5468]">
          The AI assistant for your website.
        </p>
      </div>
      <nav aria-label="Footer">
        <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-[#4B5468]">
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
      <p className="font-receipt text-xs text-[#4B5468]">© Cortex</p>
    </Container>
  </footer>
);
