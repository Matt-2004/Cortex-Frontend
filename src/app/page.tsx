import type { Metadata } from "next";
import { plexMono, roboto } from "./features/landing/fonts";
import { Hero } from "./features/landing/ui/Hero";
import { Pricing } from "./features/landing/ui/Pricing";
import { SiteFooter } from "./features/landing/ui/SiteFooter";
import { SiteHeader } from "./features/landing/ui/SiteHeader";
import {
  BusinessValue,
  CitedAnswers,
  GetStarted,
  HowItWorks,
  Recommendations,
  WhyCortex,
} from "./features/landing/ui/demos";
import { Faq } from "./features/landing/ui/sections";

export const metadata: Metadata = {
  title: "Cortex · AI assistant for your website",
  description:
    "Cortex puts an AI assistant on your website that answers policy questions from your own documents and pages, shows its sources, and recommends the right products.",
};

/* The sections below share one layout (see <Section> in landing/ui/primitives):
   text on the left, one supporting visual on the right. The visuals are demos
   that play when they scroll into view (landing/ui/demos.tsx). Backgrounds alternate
   between white and the teal wash, with one deep-teal band for the closing
   call to action. Navy is never used as a background.
   The FAQ is the exception to the layout: full width, no frame. */
export default function HomePage() {
  return (
    <div
      className={`${roboto.variable} ${plexMono.variable} bg-white text-brand-ink`}
    >
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:rounded-control focus:bg-primary-700 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Skip to content
      </a>
      <SiteHeader />
      <main id="main">
        {/* Order: what it is, what it saves, what it does (two features), why trust it, how to set it up, cost. */}
        <Hero />
        <BusinessValue />
        <CitedAnswers />
        <Recommendations />
        <WhyCortex />
        <HowItWorks />
        <Pricing />
        <Faq />
        <GetStarted />
      </main>
      <SiteFooter />
    </div>
  );
}
