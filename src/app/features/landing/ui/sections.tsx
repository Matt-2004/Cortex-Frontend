import Link from "next/link";
import { FileText, Globe, Type } from "lucide-react";
import {
  Cite,
  Container,
  DEMO_PRODUCTS,
  Figure,
  JacketArt,
  Label,
  Mark,
  Section,
  figureCard,
  sectionShell,
  sectionTitle,
  lightButton,
} from "./primitives";

/* The static sections of the landing page. Each one is a <Section> (text left,
   one visual right) and states its purpose in the comment above it. The FAQ is
   the exception: it runs the full width with no frame.
   The visuals are small product mock-ups built in markup; swap any of them
   for a real screenshot by rendering <Image> inside the <Figure>. */

const userBubble =
  "max-w-[85%] self-end rounded-md rounded-br-none bg-primary-700 px-3.5 py-2.5 text-white";
const botBubble =
  "max-w-[92%] self-start rounded-md rounded-bl-none border border-brand-ink/10 bg-white px-3.5 py-2.5 text-brand-ink";

/* ── Purpose: show that setup is short. Each step has its own picture. ── */

const stepBadge =
  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-700 font-receipt text-sm text-white";

const SOURCES = [
  { icon: FileText, name: "Returns policy.pdf" },
  { icon: Globe, name: "yourstore.com/shipping" },
  { icon: Type, name: "Size guide (pasted text)" },
];

/** Step 1: sources being added to the knowledge base. */
const AddContentVisual = () => (
  <ul className="flex flex-col gap-1.5">
    {SOURCES.map(({ icon: Icon, name }) => (
      <li
        key={name}
        className="flex items-center gap-2.5 rounded-md border border-brand-ink/10 px-3 py-1.5"
      >
        <Icon className="h-3.5 w-3.5 shrink-0 text-[#69728A]" />
        <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-brand-ink">
          {name}
        </span>
        <span className="font-receipt text-[10.5px] text-primary-700">
          indexed
        </span>
      </li>
    ))}
  </ul>
);

/** Step 2: a test question answered with a citation. */
const TestAnswersVisual = () => (
  <div className="flex flex-col gap-2 text-[13px] leading-relaxed">
    <p className="max-w-[85%] self-end rounded-md rounded-br-none bg-primary-700 px-3 py-2 text-white">
      How long do refunds take?
    </p>
    <p className="self-start rounded-md rounded-bl-none bg-brand-mist px-3 py-2 text-brand-ink">
      5–7 business days
      <Cite n={1} />
    </p>
    <p className="font-receipt text-[10.5px] text-[#4B5468]">
      1 · Returns policy.pdf, page 2
    </p>
  </div>
);

/** Step 3: the line of code a store pastes into its site, and the button it adds.
    ILLUSTRATIVE: the widget isn't built yet, so the script URL and attribute are placeholders. */
const OnYourSiteVisual = () => (
  <div className="flex flex-col gap-2">
    <div className="rounded-md border border-brand-ink/10 bg-brand-mist p-3">
      <div className="flex items-center justify-between font-receipt text-[10px] text-[#4B5468]">
        <span>Paste before {"</body>"}</span>
        <span className="rounded-[3px] border border-brand-ink/15 bg-white px-1.5 py-0.5 text-brand-ink">
          Copy
        </span>
      </div>
      <pre className="mt-2 font-receipt text-[11px] leading-relaxed whitespace-pre-wrap text-brand-ink">
        <span className="text-primary-700">{"<script"}</span>
        {" src="}
        <span className="text-[#4B5468]">
          {'"https://cortex.example/widget.js"'}
        </span>
        {"\n  data-site="}
        <span className="text-[#4B5468]">{'"your-site-id"'}</span>
        {" async"}
        <span className="text-primary-700">{"></script>"}</span>
      </pre>
    </div>
    <div className="flex items-center justify-between rounded-md border border-brand-ink/10 py-1.5 pr-1.5 pl-3">
      <span className="font-receipt text-[10.5px] text-[#4B5468]">
        yourstore.com
      </span>
      <span className="rounded-md bg-brand-teal px-3 py-1.5 text-[11px] font-semibold text-brand-ink">
        Ask us anything
      </span>
    </div>
  </div>
);

const STEPS = [
  {
    title: "Add your content",
    detail: "PDFs, pages from your site, or pasted text.",
    visual: <AddContentVisual />,
  },
  {
    title: "Test the answers",
    detail: "Ask real questions and check the sources.",
    visual: <TestAnswersVisual />,
  },
  {
    title: "Paste one line on your site",
    detail: "The assistant appears for your visitors.",
    visual: <OnYourSiteVisual />,
  },
];

export const HowItWorks = () => (
  <Section
    id="how-it-works"
    tone="wash"
    pattern="dots"
    label="How it works"
    title="Set up in three steps"
    figure={
      <Figure alt="Step 1: three sources indexed in the knowledge base. Step 2: a test question answered with a citation. Step 3: one line of code pasted into the store’s website adds the assistant.">
        {/* One picture per step, numbered to match the list beside it. */}
        <ol className="w-full">
          {STEPS.map((step, index) => {
            const last = index === STEPS.length - 1;
            return (
              <li key={step.title} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <span className={stepBadge}>{index + 1}</span>
                  {!last && (
                    <span className="mt-2 w-px flex-1 bg-brand-ink/20" />
                  )}
                </div>
                <div className={`min-w-0 flex-1 ${last ? "" : "pb-4"}`}>
                  <div className="rounded-lg border border-brand-ink/10 bg-white p-4 shadow-[0_12px_24px_-18px_rgba(18,23,42,0.35)]">
                    {step.visual}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </Figure>
    }
  >
    <ol className="flex flex-col gap-5">
      {STEPS.map((step, index) => (
        <li key={step.title} className="flex gap-4">
          <span className={stepBadge}>{index + 1}</span>
          <div>
            <p className="text-lg leading-8 font-medium text-brand-ink">
              {step.title}
            </p>
            <p className="text-[15px] text-[#4B5468]">{step.detail}</p>
          </div>
        </li>
      ))}
    </ol>
  </Section>
);

/* ── Purpose: the main feature. Answers can be checked. ── */

export const CitedAnswers = () => (
  <Section
    id="features"
    pattern="ruled"
    label="Cited answers"
    title="Every answer shows its source"
    lead="Visitors can open the exact passage an answer came from."
    figure={
      <Figure alt="An answer about the return window with a numbered citation, and the cited passage highlighted in the returns policy.">
        <div className="flex w-full flex-col gap-3 text-[15px] leading-relaxed">
          <p className={userBubble}>What’s your return window?</p>
          <p className={botBubble}>
            You have 30 days from delivery to send an item{" "}
            <span className="whitespace-nowrap">
              back
              <Cite n={1} />.
            </span>
          </p>
          <div className={`${figureCard} mt-2 p-5`}>
            <Label className="text-[#4B5468]">
              <span className="mr-1.5 text-primary-700">1</span>Returns
              policy.pdf · page 2
            </Label>
            <p className="mt-3 font-display text-xl leading-snug text-brand-ink">
              Items may be returned <Mark>within 30 days of delivery</Mark>,
              provided they are in their original condition.
            </p>
          </div>
        </div>
      </Figure>
    }
  />
);

/* ── Purpose: why this beats a general chatbot. ── */

export const WhyCortex = () => (
  <Section
    id="why-cortex"
    label="Why Cortex"
    title="A generic chatbot guesses. Cortex checks."
    lead="Answers come only from your content, never from the model’s memory."
    figure={
      <Figure alt="The same question answered twice. A generic chatbot invents a 60-day return window. Cortex answers 30 days and cites the returns policy.">
        <div className="flex w-full flex-col gap-4 text-[17px] leading-relaxed">
          <div className={`${figureCard} p-6`}>
            <div className="flex items-baseline justify-between">
              <Label className="text-[#4B5468]">Generic chatbot</Label>
              <p className="font-display text-xl text-brand-pen italic">
                Made up
              </p>
            </div>
            <p className="mt-3 text-brand-ink">
              Most stores offer{" "}
              <span className="landing-pen-strike">60 days</span>, so you should
              be fine!
            </p>
          </div>
          <div className={`${figureCard} border-brand-teal p-6`}>
            <div className="flex items-baseline justify-between">
              <Label className="text-primary-700">Cortex</Label>
              <p className="font-receipt text-[11px] text-[#4B5468]">
                Returns policy.pdf, p. 2
              </p>
            </div>
            <p className="mt-3 text-brand-ink">
              You have <Mark>30 days from delivery</Mark>
              <Cite n={1} />.
            </p>
          </div>
        </div>
      </Figure>
    }
  />
);

/* ── Purpose: the second feature. It can sell, not only answer. ── */

export const Recommendations = () => (
  <Section
    id="recommendations"
    tone="wash"
    pattern="grid"
    label="Recommendations"
    title="Suggests the right product"
    lead="It matches what visitors ask for with items in your catalog."
    figure={
      <Figure alt="A visitor asks for a waterproof jacket under 200 dollars and is shown two matching jackets from the catalog, with pictures and prices.">
        <div className="flex w-full flex-col gap-3 text-[15px] leading-relaxed">
          <p className={userBubble}>A waterproof jacket under $200?</p>
          <div className="grid grid-cols-2 gap-3">
            {DEMO_PRODUCTS.map((product) => (
              <div key={product.name} className={`${figureCard} p-3`}>
                <div
                  className="relative h-36 rounded-md p-3"
                  style={{ background: product.backdrop }}
                >
                  <JacketArt
                    color={product.color}
                    shade={product.shade}
                    chestPocket={product.chestPocket}
                  />
                  <span className="absolute top-2 left-2 rounded-[3px] bg-white px-1.5 py-0.5 font-receipt text-[10px] text-primary-700">
                    match
                  </span>
                </div>
                <p className="mt-3 truncate text-sm font-semibold text-brand-ink">
                  {product.name}
                </p>
                <p className="truncate text-xs text-[#4B5468]">
                  {product.detail}
                </p>
                <p className="mt-1.5 font-receipt text-sm font-medium text-brand-ink">
                  {product.price}
                </p>
              </div>
            ))}
          </div>
          <p className="font-receipt text-[11px] text-[#4B5468]">
            2 of 14 jackets in your catalog match
          </p>
        </div>
      </Figure>
    }
  />
);

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
    className={`${sectionShell} bg-brand-wash`}
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
            <summary className="flex cursor-pointer list-none items-baseline justify-between gap-6 rounded-sm py-6 font-display text-2xl leading-snug tracking-[-0.01em] text-brand-ink sm:text-[1.75rem] [&::-webkit-details-marker]:hidden">
              {q}
              <span
                aria-hidden="true"
                className="font-receipt text-2xl text-[#4B5468] transition-transform duration-200 group-open:rotate-45 group-open:text-primary-700"
              >
                +
              </span>
            </summary>
            <p className="max-w-3xl pb-7 text-lg leading-relaxed text-[#4B5468]">
              {a}
            </p>
          </details>
        ))}
      </div>
    </Container>
  </section>
);

/* ── Purpose: the closing call to action. ── */

export const GetStarted = () => (
  <Section
    id="get-started"
    tone="teal"
    pattern="dots-light"
    label="Get started"
    title="Try it with one policy document"
    lead="Upload a file and ask the question your customers ask most."
    figure={
      <Figure alt="An upload area for a policy document, with one PDF already indexed.">
        <div className={`${figureCard} p-5`}>
          <div className="flex flex-col items-center rounded-md border border-dashed border-brand-ink/25 px-6 py-12 text-center">
            <FileText className="h-7 w-7 text-primary-700" />
            <p className="mt-3 text-sm font-semibold text-brand-ink">
              Drop a policy document
            </p>
            <p className="mt-1 text-xs text-[#4B5468]">PDF, up to 20 MB</p>
          </div>
          <div className="mt-3 flex items-center gap-3 rounded-md border border-brand-ink/10 px-3 py-3">
            <FileText className="h-4 w-4 shrink-0 text-[#69728A]" />
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-brand-ink">
              Returns policy.pdf
            </span>
            <span className="font-receipt text-[11px] text-primary-700">
              indexed
            </span>
          </div>
        </div>
      </Figure>
    }
  >
    <Link href="/auth/register" className={lightButton}>
      Start free
    </Link>
  </Section>
);
