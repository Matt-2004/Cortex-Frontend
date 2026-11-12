import Link from "next/link";
import { MobileMenu } from "./MobileMenu";
import { SectionNav } from "./SectionNav";
import { Brand, Container, primaryButtonLook, textLink } from "./primitives";

/** Same order as the sections on the page. */
const LINKS: { href: `#${string}`; label: string }[] = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
];

/** White bar that stays at the top. Below md the section links move into a menu. */
export const SiteHeader = () => (
  <header className="sticky top-0 z-50 border-b border-brand-ink/10 bg-white">
    <Container className="flex h-16 items-center justify-between gap-4">
      <Brand />
      <div className="flex items-center gap-3 text-sm text-brand-ink md:gap-6">
        <SectionNav links={LINKS} />
        <Link href="/auth/login" className={`${textLink} hidden md:inline`}>
          Sign in
        </Link>
        {/* Where customers manage their organizations. Signed-out visitors
            are sent to sign in from there. */}
        <Link
          href="/console"
          className="hidden h-9 items-center rounded-md border border-brand-ink/15 px-4 font-medium text-brand-ink transition-colors duration-150 hover:border-brand-ink/30 hover:bg-brand-wash md:inline-flex"
        >
          Console
        </Link>
        <Link href="/auth/register" className={`${primaryButtonLook} h-9 px-4`}>
          Start free
        </Link>
        <MobileMenu
          links={[
            ...LINKS,
            { href: "/console", label: "Console" },
            { href: "/auth/login", label: "Sign in" },
          ]}
        />
      </div>
    </Container>
  </header>
);
