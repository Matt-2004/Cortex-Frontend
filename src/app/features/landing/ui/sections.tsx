import { Container, Label, sectionShell, sectionTitle } from "./primitives";

/* The one static section of the landing page. The others are in demos.tsx:
   each is a <Section> (text left, one visual right) whose visual plays as a
   demo. The FAQ is the exception to that layout: full width, no frame. */

/* ── Purpose: clear the last doubts. ── */

const QUESTIONS = [
  {
    q: "What can it learn from?",
    a: "PDFs and documents, pages from your site, and text you paste in.",
  },
  {
    q: "Will it make things up?",
    a: "No. If your content doesn’t cover a question, it says it doesn’t know.",
  },
  {
    q: "How do visitors know where an answer came from?",
    a: "Every answer carries numbered citations that open the passage it was based on.",
  },
  {
    q: "Can it recommend products?",
    a: "Yes, from your catalog. You can switch this off.",
  },
  {
    q: "Do I need a developer?",
    a: "Not to start. You add content and test answers in the dashboard, then paste one line of code to go live.",
  },
];

/**
 * The one section that doesn't use <Section>: the questions run the full width
 * of the page, with no frame or card around them.
 * Native <details>, so it opens without JavaScript and is keyboard-friendly by default.
 */
export const Faq = () => (
  <section
    id="faq"
    aria-labelledby="faq-title"
    className={`${sectionShell} bg-white`}
  >
    <Container>
      <Label className="text-primary-700">FAQ</Label>
      <h2
        id="faq-title"
        className={`${sectionTitle} text-4xl text-brand-ink sm:text-5xl`}
      >
        Common questions
      </h2>

      <div className="mt-10 border-b border-brand-ink/15 lg:mt-12">
        {/* The first answer starts open, so it's clear the rows expand. */}
        {QUESTIONS.map(({ q, a }, index) => (
          <details
            key={q}
            open={index === 0}
            className="group border-t border-brand-ink/15"
          >
            <summary className="flex cursor-pointer list-none items-baseline justify-between gap-6 rounded-badge py-6 font-display text-2xl leading-snug tracking-[-0.01em] text-brand-ink sm:text-[1.75rem] [&::-webkit-details-marker]:hidden">
              {q}
              <span
                aria-hidden="true"
                className="font-receipt text-2xl text-brand-ink-muted transition-transform duration-200 group-open:rotate-45 group-open:text-primary-700"
              >
                +
              </span>
            </summary>
            <p className="max-w-3xl pb-7 text-lg leading-relaxed text-brand-ink-muted">
              {a}
            </p>
          </details>
        ))}
      </div>
    </Container>
  </section>
);
