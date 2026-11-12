import Link from "next/link";
import { HeroChatDemo } from "./HeroChatDemo";
import { Mark, Section, primaryButton, textLink } from "./primitives";

/** Purpose: say what Cortex is in the headline, and show it answering on a website. */
export const Hero = () => (
  <Section
    hero
    tone="wash"
    pattern="dots"
    id="top"
    label="For stores and business websites"
    title="An AI assistant for your website"
    lead={
      <>
        It answers visitors’ questions about shipping, returns and policies from{" "}
        <Mark motion="load">your own documents</Mark>, shows the source of every
        answer, and recommends products from your catalog.
      </>
    }
    figure={<HeroChatDemo />}
  >
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
      <Link href="/auth/register" className={primaryButton}>
        Start free
      </Link>
      <a
        href="#how-it-works"
        className={`${textLink} text-[15px] text-brand-ink`}
      >
        See how it works
      </a>
    </div>
    {/* The first screen's hard fact; the steps are the section linked above. */}
    <p className="mt-6 font-receipt text-xs text-[#4B5468]">
      Set up in 3 steps · Live with 1 line of code
    </p>
  </Section>
);
