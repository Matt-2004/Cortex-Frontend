/** The landing page's section links, in page order, shown in the footer.
    The header has none.
    "Features" covers the three feature sections (cited answers,
    recommendations, why Cortex). */
export const SECTION_LINKS: { href: `#${string}`; label: string }[] = [
  { href: "#business-value", label: "Business value" },
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
];

/** Pages outside the landing page, after the section links. */
export const PAGE_LINKS = [
  { href: "/console", label: "Console" },
  { href: "/auth/login", label: "Sign in" },
];
