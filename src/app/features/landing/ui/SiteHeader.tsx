import Link from "next/link";
import { Brand, Container, primaryButtonLook } from "./primitives";

/** White bar that stays at the top: the brand, Log in and Start free.
    No section links. Short enough to need no mobile menu. */
export const SiteHeader = () => (
  <header className="sticky top-0 z-50 border-b border-brand-ink/10 bg-white">
    <Container className="flex h-16 items-center justify-between gap-4">
      <Brand />
      <div className="flex items-center gap-3 text-sm text-brand-ink md:gap-6">
        {/* No prefetch: the click must reach the proxy, which sends people
            who are already signed in on to the console. */}
        <Link
          href="/auth/login"
          prefetch={false}
          className="inline-flex h-9 items-center rounded-control border border-brand-ink/15 px-4 font-medium text-brand-ink transition-colors duration-150 hover:border-brand-ink/30 hover:bg-brand-wash"
        >
          Log in
        </Link>
        <Link href="/auth/register" className={`${primaryButtonLook} h-9 px-4`}>
          Start free
        </Link>
      </div>
    </Container>
  </header>
);
