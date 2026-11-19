import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { clsx } from "clsx";
import { Reveal } from "./Reveal";

/* ────────────────────────────────────────────────────────────
 * Shared building blocks for the marketing page (/).
 *
 * Sections use <Section>: a short label, a heading and one line of text on
 * the left, one supporting visual on the right. Keep new sections on that
 * layout. Each section picks a background tone, and optionally a quiet pattern
 * that relates to what it shows.
 *
 * Colour: white and the neutral wash for sections, one deep-teal band for the
 * closing call to action, and teal (the logo's dot) as the one action colour. Navy is for text,
 * never a background. Spacing: sections share sectionShell; visuals have no
 * box around them: their cards float on the section (shadow-float). The one
 * exception to the layout is the FAQ, which runs the full width (it reuses
 * sectionShell and sectionTitle).
 * No client code here, so sections can stay Server Components.
 * ──────────────────────────────────────────────────────────── */

export const Container = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => (
  <div
    className={clsx("mx-auto w-full max-w-[1200px] px-5 sm:px-8", className)}
  >
    {children}
  </div>
);

export const Brand = () => (
  <Link
    href="/"
    aria-label="Cortex home"
    className="inline-flex items-center gap-2.5 rounded-badge"
  >
    <Image
      src="/brand/cortex-cx-mark.svg"
      alt=""
      width={26}
      height={26}
      priority
    />
    <span className="text-[17px] font-semibold tracking-[-0.02em] text-brand-ink">
      Cortex
    </span>
  </Link>
);

/** Highlighter over a phrase. "load" sweeps across once when the page loads. */
export const Mark = ({
  children,
  motion = "none",
}: {
  children: ReactNode;
  motion?: "load" | "none";
}) => (
  <mark
    className={clsx("landing-mark", motion === "load" && "landing-mark-load")}
  >
    {children}
  </mark>
);

/** Small numbered citation chip, as used in the real chat.
    "accent" follows --chat-accent, the colour of the hero's chat widget. */
export const Cite = ({
  n,
  tone = "light",
}: {
  n: number;
  tone?: "accent" | "light";
}) => (
  <span
    className={clsx(
      "ml-1 inline-flex h-4 min-w-4 -translate-y-px items-center justify-center rounded-badge px-1 align-middle text-[10px] font-semibold",
      tone === "accent"
        ? "bg-[color-mix(in_srgb,var(--chat-accent)_16%,white)] text-[var(--chat-accent)] transition-colors duration-500"
        : "bg-primary-100 text-primary-800",
    )}
  >
    {n}
  </span>
);

/** Small monospace label: section names, file names, captions. */
export const Label = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => (
  <p
    className={clsx(
      "font-receipt text-[11px] tracking-[0.1em] uppercase",
      className,
    )}
  >
    {children}
  </p>
);

/** A button answers the pointer: it steps up 1px on hover and sinks on press. */
const buttonMotion =
  "transition-[background-color,translate] duration-150 hover:-translate-y-px active:translate-y-px active:duration-75 motion-reduce:translate-y-0";

/** The one action colour: teal with navy text, on every background. */
export const primaryButtonLook = `inline-flex items-center justify-center rounded-control bg-brand-teal font-semibold text-brand-ink hover:bg-primary-400 active:bg-primary-500 ${buttonMotion}`;

export const primaryButton = `${primaryButtonLook} h-12 px-6 text-[15px]`;

/** For the deep-teal band, where the teal button would disappear. */
export const lightButton = `inline-flex h-12 items-center justify-center rounded-control bg-white px-6 text-[15px] font-semibold text-brand-ink hover:bg-primary-50 ${buttonMotion}`;

export const textLink =
  "font-medium underline decoration-current/30 decoration-1 underline-offset-4 transition-[text-decoration-color] duration-150 hover:decoration-brand-teal";

/** Where a supporting visual sits. No box of its own: the visual's cards float
    straight on the section, lifted by shadow-float. */
export const figureFrame = "flex items-center justify-center";

/** A white card that floats on the section. */
export const figureCard =
  "w-full rounded-box border border-brand-ink/10 bg-white shadow-float";

/**
 * The supporting visual of a section.
 * Pass `alt` when the content is an illustration: it is then hidden from screen
 * readers and described by `alt` instead. Leave `alt` out when the frame holds
 * real content (the price list).
 * To use a real image or screenshot, render <Image> as the child.
 */
export const Figure = ({
  children,
  alt,
}: {
  children: ReactNode;
  alt?: string;
}) =>
  alt ? (
    <div className={figureFrame}>
      <p className="sr-only">{alt}</p>
      <div aria-hidden="true" className="flex w-full justify-center">
        {children}
      </div>
    </div>
  ) : (
    <div className={figureFrame}>{children}</div>
  );

/** Flat drawing of a hooded jacket, coloured per product. Stands in for a product photo. */
export const JacketArt = ({
  color,
  shade,
  chestPocket = false,
}: {
  color: string;
  shade: string;
  chestPocket?: boolean;
}) => (
  <svg viewBox="0 0 200 184" className="h-full w-full">
    {/* sleeves */}
    <path d="M64 52 40 66 22 140l22 8 20-50Z" fill={shade} />
    <path d="m136 52 24 14 18 74-22 8-20-50Z" fill={shade} />
    {/* body */}
    <path d="M62 52q38 10 76 0l4 110q-42 8-84 0Z" fill={color} />
    {/* hood */}
    <path d="M78 54q-4-33 22-35 26 2 22 35-22 10-44 0Z" fill={shade} />
    <path
      d="M86 52q-1-21 14-22 15 1 14 22-14 6-28 0Z"
      fill="#12172A"
      opacity="0.4"
    />
    {/* zip, pockets, cuffs */}
    <path
      d="M100 58v106"
      stroke="#fff"
      strokeOpacity="0.75"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
    <path
      d="m72 124 16-8m40 8-16-8"
      stroke="#12172A"
      strokeOpacity="0.35"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
    {chestPocket && (
      <path
        d="M112 88h16"
        stroke="#fff"
        strokeOpacity="0.75"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    )}
    <path
      d="m22 140 22 8-2 7-22-8Zm156 0-22 8 2 7 22-8Z"
      fill="#12172A"
      opacity="0.3"
    />
  </svg>
);

/** The two example products shown in the hero demo and the recommendations section. */
export const DEMO_PRODUCTS = [
  {
    name: "Ridgeline Shell",
    detail: "3-layer · Waterproof",
    price: "$179",
    color: "#2F6F8F",
    shade: "#255870",
    backdrop: "#E2EDF2",
    chestPocket: true,
  },
  {
    name: "Trailhead Rain Jacket",
    detail: "Packable · Waterproof",
    price: "$149",
    color: "#C9772B",
    shade: "#A66022",
    backdrop: "#F6E9DB",
    chestPocket: false,
  },
];

/** Spacing shared by every section, including the full-width FAQ. Add a background. */
export const sectionShell = "scroll-mt-16 py-16 sm:py-20 lg:py-24";

/** Heading look shared by every section. Add a size and a colour. */
export const sectionTitle =
  "mt-4 font-display leading-[1.06] font-heading tracking-[-0.022em] text-balance";

export type SectionTone = "white" | "wash" | "teal";

/** Background of the section. */
const TONES: Record<SectionTone, string> = {
  white: "bg-white",
  wash: "bg-brand-wash",
  teal: "bg-primary-700",
};

/** Patterns are defined in globals.css. Each stands for something in the section it backs. */
const PATTERNS = {
  /** Dot paper. */
  dots: "landing-bg-dots",
  /** The same dots in white, for the deep-teal band. */
  "dots-light": "landing-bg-dots-light",
  /** Ruled lines, like a page of a document: for sections about sources. */
  ruled: "landing-bg-ruled",
  /** A shelf-like grid: for the product catalog. */
  grid: "landing-bg-grid",
};

type SectionProps = {
  id: string;
  /** Names the section's purpose in two or three words. */
  label: string;
  title: ReactNode;
  /** One sentence. */
  lead?: ReactNode;
  /** Optional extra under the lead: a short list, a switch or a button. */
  children?: ReactNode;
  /** The supporting visual, normally a <Figure>. */
  figure: ReactNode;
  /** The first section: renders an <h1>, larger. */
  hero?: boolean;
  tone?: SectionTone;
  pattern?: keyof typeof PATTERNS;
};

/** The one layout used by every section: text left, visual right. */
export const Section = ({
  id,
  label,
  title,
  lead,
  children,
  figure,
  hero = false,
  tone = "white",
  pattern,
}: SectionProps) => {
  const Heading = hero ? "h1" : "h2";
  const dark = tone === "teal";
  const section = TONES[tone];
  const TextColumn = hero ? "div" : Reveal;
  const FigureColumn = hero ? "div" : Reveal;
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className={clsx(
        sectionShell,
        section,
        "relative isolate overflow-hidden",
        // On a laptop each section gets the screen under the header to
        // itself, capped so a tall monitor doesn't leave it adrift.
        "lg:flex lg:min-h-[min(calc(100svh-4rem),780px)] lg:items-center",
      )}
    >
      {pattern && (
        <div
          aria-hidden="true"
          className={clsx(
            "landing-bg pointer-events-none absolute inset-0 -z-10",
            PATTERNS[pattern],
          )}
        />
      )}
      <Container className="grid items-center gap-12 lg:grid-cols-12 lg:gap-x-8">
        {/* The hero rises on load; every other section's text rises, line
            by line, when it scrolls into view. */}
        <TextColumn
          className={clsx("min-w-0 lg:col-span-5", hero && "landing-rise")}
        >
          <Label className={dark ? "text-primary-100" : "text-primary-700"}>
            {label}
          </Label>
          <Heading
            id={`${id}-title`}
            className={clsx(
              sectionTitle,
              dark ? "text-white" : "text-brand-ink",
              hero
                ? "text-[2.75rem] sm:text-6xl xl:text-[4rem]"
                : "text-4xl sm:text-5xl",
            )}
          >
            {title}
          </Heading>
          {lead && (
            <p
              className={clsx(
                "mt-5 max-w-md text-lg leading-relaxed text-pretty",
                dark ? "text-white/85" : "text-brand-ink-muted",
              )}
            >
              {lead}
            </p>
          )}
          {children && <div className="mt-8">{children}</div>}
        </TextColumn>
        {/* Capped on tablets so the visual doesn't stretch across the page. */}
        <FigureColumn className="w-full max-w-[600px] min-w-0 lg:col-span-6 lg:col-start-7 lg:max-w-none">
          <div>{figure}</div>
        </FigureColumn>
      </Container>
    </section>
  );
};
