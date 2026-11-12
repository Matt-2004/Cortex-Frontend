"use client";

import {
  useEffect,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
} from "react";
import Link from "next/link";
import { clsx } from "clsx";
import { FileText, Globe, RotateCcw, Type } from "lucide-react";
import {
  Cite,
  DEMO_PRODUCTS,
  JacketArt,
  Label,
  Section,
  figureCard,
  figureFrame,
  lightButton,
} from "./primitives";

/* ────────────────────────────────────────────────────────────
 * The landing page's sections whose visual is a demo: the product doing its
 * job, step by step, instead of a still picture of it.
 *
 * How a demo runs (useTimeline):
 * - It waits, empty, below the screen; starts once 40% of its frame is in
 *   view; plays once and rests on its last frame. Scrolled fully away, it
 *   resets, so it plays again on the way back. "Replay" restarts it.
 *   Nothing loops, so nothing needs a pause button.
 * - Without JavaScript and under reduced motion it shows its last frame:
 *   the finished picture, never an empty box.
 * - Every element is in the layout from the start and only fades, slides or
 *   draws in (.demo-* in globals.css), so a frame never changes size while
 *   it plays.
 *
 * The motion says what happens: an answer is being written (dots, then
 * words), someone clicks (the pointer), a state changes (labels cross-fade).
 *
 * The demos are illustrations: screen readers get the `alt` description, and
 * the controls (Replay, the example requests) are real buttons outside it.
 * ──────────────────────────────────────────────────────────── */

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

const subscribeReducedMotion = (onChange: () => void) => {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};

const useReducedMotion = () =>
  useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_MOTION).matches,
    () => false,
  );

/* Every section demo runs for 2.5 seconds in all: each *_STEPS list below adds
   up to it, so the duration bars all fill at the same pace. (The hero's
   conversations are longer and time themselves.) */

/** How much of the frame must be on screen before its demo starts. */
const START_AT = 0.4;

/**
 * Plays a demo. `durations[n]` is how long step n stays before step n + 1;
 * pass a constant array. Returns `on(n)`: has the demo reached step n?
 */
function useTimeline(durations: readonly number[]) {
  const total = durations.length;
  // A callback ref kept in state: the observer starts once the frame exists.
  const [frame, setFrame] = useState<HTMLDivElement | null>(null);
  // Starts on the last frame, which is what the server renders.
  const [step, setStep] = useState(total);
  const [playing, setPlaying] = useState(false);
  // Goes up at every start, so the duration bar restarts with the demo.
  const [run, setRun] = useState(0);
  const reduced = useReducedMotion();
  const start = () => {
    setStep(0);
    setPlaying(true);
    setRun((value) => value + 1);
  };

  useEffect(() => {
    if (!frame) return;
    // Whether this visit has started the demo, so it starts once per visit.
    let started = false;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.intersectionRatio >= START_AT) {
          if (started) return;
          started = true;
          setStep(0);
          setPlaying(true);
          setRun((value) => value + 1);
        } else if (!entry.isIntersecting) {
          // Fully off screen: empty it, ready for the next visit.
          started = false;
          setPlaying(false);
          setStep(0);
        }
      },
      { threshold: [0, START_AT] },
    );
    observer.observe(frame);
    return () => observer.disconnect();
  }, [frame]);

  useEffect(() => {
    if (!playing || reduced || step >= total) return;
    const id = setTimeout(() => setStep((value) => value + 1), durations[step]);
    return () => clearTimeout(id);
  }, [playing, reduced, step, total, durations]);

  const at = reduced ? total : step;
  return {
    on: (n: number) => at >= n,
    /** True only while step n is the current one. */
    during: (n: number) => at === n,
    replay: start,
    /** Spread onto the demo's <DemoFigure>. */
    figure: {
      frameRef: setFrame,
      onReplay: start,
      // Under reduced motion there is nothing to replay.
      canReplay: !reduced,
      /** How long the demo takes, start to last frame. */
      totalMs: durations.reduce((sum, ms) => sum + ms, 0),
      run,
      progress: (playing ? "running" : step >= total ? "done" : "waiting") as
        "running" | "done" | "waiting",
    },
  };
}

/** Something that arrives at a step: it settles into its own place. */
const Step = ({
  on,
  inline = false,
  className,
  children,
}: {
  on: boolean;
  inline?: boolean;
  className?: string;
  children: ReactNode;
}) => {
  const Tag = inline ? "span" : "div";
  return (
    <Tag
      data-on={on}
      className={clsx("demo-step", inline && "inline-block", className)}
    >
      {children}
    </Tag>
  );
};

/** Text that streams in word by word, the way an answer is written. */
const Stream = ({
  text,
  on,
  after = 0,
}: {
  text: string;
  on: boolean;
  /** Words already written before this run, so it carries on in time. */
  after?: number;
}) => (
  <>
    {text.split(" ").map((word, index) => (
      <span
        key={index}
        data-on={on}
        className="demo-word"
        style={{ transitionDelay: on ? `${(after + index) * 35}ms` : "0ms" }}
      >
        {word}{" "}
      </span>
    ))}
  </>
);

/** One more piece of a streamed sentence (a marked phrase, a chip). */
const StreamPart = ({
  on,
  after,
  children,
}: {
  on: boolean;
  after: number;
  children: ReactNode;
}) => (
  <span
    data-on={on}
    className="demo-word"
    style={{ transitionDelay: on ? `${after * 35}ms` : "0ms" }}
  >
    {children}
  </span>
);

/** Three dots where the answer is about to be written. */
const Typing = ({ on }: { on: boolean }) => (
  <span
    data-on={on}
    className="demo-typing absolute top-1/2 left-3.5 flex -translate-y-1/2 gap-1 text-[#4B5468]"
  >
    <i />
    <i />
    <i />
  </span>
);

/** The highlighter, drawn across the phrase when `on`. */
const Highlight = ({ on, children }: { on: boolean; children: ReactNode }) => (
  <mark data-on={on} className="landing-mark demo-mark">
    {children}
  </mark>
);

/** A status that changes in place: `from` fades up and out, `to` comes in. */
const Swap = ({
  on,
  from,
  to,
  className,
}: {
  on: boolean;
  from: string;
  to: string;
  className?: string;
}) => (
  <span data-on={on} className={clsx("demo-swap", className)}>
    <span className="text-[#8B93A8]">{from}</span>
    <span className="text-primary-700">{to}</span>
  </span>
);

/**
 * The pointer. Put it inside the (relative) thing it clicks: it glides onto
 * its centre when `on` and pushes down when `press`.
 */
const Cursor = ({ on, press }: { on: boolean; press: boolean }) => (
  <span data-on={on} data-press={press} className="demo-cursor">
    <svg viewBox="0 0 18 18" width="18" height="18">
      <path
        d="M2 1.5v13l3.6-3.3 2.3 5 2.2-1-2.3-4.9 4.9-.3Z"
        fill="#12172A"
        stroke="#fff"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  </span>
);

/**
 * The frame a demo plays in, with its description for screen readers and
 * the controls under it.
 */
const DemoFigure = ({
  frameRef,
  onReplay,
  canReplay,
  totalMs,
  run,
  progress,
  alt,
  dark = false,
  controls,
  children,
}: {
  frameRef: (node: HTMLDivElement | null) => void;
  onReplay: () => void;
  canReplay: boolean;
  totalMs: number;
  run: number;
  progress: "running" | "done" | "waiting";
  alt: string;
  /** On the deep-teal band. */
  dark?: boolean;
  /** Extra controls, left of Replay. */
  controls?: ReactNode;
  children: ReactNode;
}) => (
  <div>
    <div ref={frameRef} className={figureFrame}>
      <p className="sr-only">{alt}</p>
      <div aria-hidden="true" className="flex w-full justify-center">
        {children}
      </div>
    </div>
    {/* How long the demo takes: a line that fills over exactly that time,
        so nobody waits blind. */}
    {canReplay && (
      <div
        aria-hidden="true"
        className={clsx(
          "mx-1 mt-3 h-0.5 overflow-hidden rounded-full",
          dark ? "bg-white/20" : "bg-brand-ink/10",
        )}
      >
        <span
          key={run}
          className={clsx(
            "block h-full origin-left",
            dark ? "bg-white" : "bg-brand-teal",
            progress === "running" && "demo-clock",
            progress === "waiting" && "scale-x-0",
          )}
          style={{ "--fill-ms": `${totalMs}ms` } as CSSProperties}
        />
      </div>
    )}
    <div className="mt-2 flex min-h-8 flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <div className="flex flex-wrap items-center gap-2">{controls}</div>
      {canReplay && (
        <button
          type="button"
          onClick={onReplay}
          className={clsx(
            "group ml-auto inline-flex h-8 items-center gap-1.5 rounded-md px-2 font-receipt text-[11px] tracking-[0.06em] uppercase transition-colors duration-150",
            dark
              ? "text-white/80 hover:bg-white/10 hover:text-white focus-visible:outline-white"
              : "text-[#4B5468] hover:bg-brand-ink/5 hover:text-brand-ink",
          )}
        >
          <RotateCcw
            aria-hidden="true"
            className="h-3 w-3 transition-[rotate] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-rotate-180 group-active:-rotate-[360deg]"
          />
          Replay
        </button>
      )}
    </div>
  </div>
);

const userBubble =
  "max-w-[85%] self-end rounded-md rounded-br-none bg-primary-700 px-3.5 py-2.5 text-white";
const botBubble =
  "relative max-w-[92%] self-start rounded-md rounded-bl-none border border-brand-ink/10 bg-white px-3.5 py-2.5 text-brand-ink";

/* ── Purpose: the main feature. Answers can be checked. ──
   The demo: a question; the answer is thought about, then written; its
   citation appears; the pointer clicks it and the cited passage opens with
   the sentence marked. */

// 1 question · 2 dots · 3 words · 4 chip · 5 pointer · 6 click · 7 passage · 8 mark
const CITED_STEPS = [180, 330, 450, 430, 250, 380, 150, 330] as const;

export const CitedAnswers = () => {
  const timeline = useTimeline(CITED_STEPS);
  const { on } = timeline;
  return (
    <Section
      id="features"
      pattern="ruled"
      label="Cited answers"
      title="Every answer shows its source"
      lead="Visitors can open the exact passage an answer came from."
      figure={
        <DemoFigure
          {...timeline.figure}
          alt="An answer about the return window with a numbered citation, and the cited passage highlighted in the returns policy."
        >
          <div className="flex w-full flex-col gap-3 text-[15px] leading-relaxed">
            <Step on={on(1)} className={userBubble}>
              What’s your return window?
            </Step>
            <Step on={on(2)} className={botBubble}>
              <Typing on={on(2) && !on(3)} />
              <Stream
                on={on(3)}
                text="You have 30 days from delivery to send an item back"
              />
              <span className="relative inline-block">
                <Step inline on={on(4)}>
                  <span
                    className={clsx(
                      "inline-block rounded-[4px] transition-shadow duration-200",
                      on(6) && "shadow-[0_0_0_2px_var(--brand-teal)]",
                    )}
                  >
                    <Cite n={1} />
                  </span>
                </Step>
                <Cursor on={on(5) && !on(8)} press={on(6)} />
              </span>
            </Step>
            <Step on={on(7)} className={`${figureCard} mt-2 p-5`}>
              <Label className="text-[#4B5468]">
                <span className="mr-1.5 text-primary-700">1</span>Returns
                policy.pdf · page 2
              </Label>
              <p className="mt-3 font-display text-xl leading-snug text-brand-ink">
                Items may be returned{" "}
                <Highlight on={on(8)}>within 30 days of delivery</Highlight>,
                provided they are in their original condition.
              </p>
            </Step>
          </div>
        </DemoFigure>
      }
    />
  );
};

/* ── Purpose: the second feature. It can sell, not only answer. ──
   The demo: a request, the catalog being searched, the matching products
   arriving. Two requests to try, with different matches. */

const ASKS = [
  {
    chip: "Under $200",
    question: "A waterproof jacket under $200?",
    matches: [0, 1],
  },
  {
    chip: "Packable",
    question: "Something packable for a trip?",
    matches: [1],
  },
];

// 1 question · 2 searching · 3, 4 the products · 5 matches marked
const RECOMMEND_STEPS = [300, 600, 850, 190, 560] as const;

export const Recommendations = () => {
  const timeline = useTimeline(RECOMMEND_STEPS);
  const { on } = timeline;
  const [askIndex, setAskIndex] = useState(0);
  const ask = ASKS[askIndex];

  return (
    <Section
      id="recommendations"
      tone="wash"
      pattern="grid"
      label="Recommendations"
      title="Suggests the right product"
      lead="It matches what visitors ask for with items in your catalog."
      figure={
        <DemoFigure
          {...timeline.figure}
          alt="A visitor asks for a jacket and is shown the matching jackets from the catalog, with pictures and prices."
          controls={
            <div
              role="group"
              aria-label="Example requests"
              className="flex flex-wrap items-center gap-2"
            >
              {ASKS.map((item, index) => (
                <button
                  key={item.chip}
                  type="button"
                  aria-pressed={index === askIndex}
                  onClick={() => {
                    setAskIndex(index);
                    timeline.replay();
                  }}
                  className={clsx(
                    "inline-flex h-8 items-center rounded-md border px-3 text-[13px] font-medium transition-[background-color,border-color,color,translate] duration-150 active:translate-y-px",
                    index === askIndex
                      ? "border-primary-700 bg-primary-700 text-white"
                      : "border-brand-ink/15 bg-white text-brand-ink hover:border-brand-ink/30",
                  )}
                >
                  {item.chip}
                </button>
              ))}
            </div>
          }
        >
          <div className="flex w-full flex-col gap-3 text-[15px] leading-relaxed">
            <Step on={on(1)} className={userBubble}>
              {ask.question}
            </Step>
            <div className="grid grid-cols-2 gap-3">
              {DEMO_PRODUCTS.map((product, index) => {
                const match = ask.matches.includes(index);
                return (
                  <Step
                    key={product.name}
                    on={on(3 + index)}
                    className={`${figureCard} p-3`}
                  >
                    {/* A product that doesn't match stays on the shelf, greyed. */}
                    <div
                      className={clsx(
                        "transition-[opacity,filter] duration-500",
                        on(5) && !match && "opacity-40 grayscale",
                      )}
                    >
                      <div
                        className="relative h-36 overflow-hidden rounded-md p-3"
                        style={{ background: product.backdrop }}
                      >
                        <div
                          className={clsx(
                            "h-full w-full transition-[scale] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]",
                            on(5) && match ? "scale-105" : "scale-100",
                          )}
                        >
                          <JacketArt
                            color={product.color}
                            shade={product.shade}
                            chestPocket={product.chestPocket}
                          />
                        </div>
                        <Step
                          inline
                          on={on(5) && match}
                          className="absolute top-2 left-2 rounded-[3px] bg-white px-1.5 py-0.5 font-receipt text-[10px] text-primary-700"
                        >
                          match
                        </Step>
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
                  </Step>
                );
              })}
            </div>
            <Step on={on(2)} className="font-receipt text-[11px]">
              <Swap
                on={on(5)}
                from="Searching 14 jackets in your catalog…"
                to={`${ask.matches.length} of 14 jackets in your catalog match`}
                className="justify-items-start [&>*]:justify-self-start"
              />
            </Step>
          </div>
        </DemoFigure>
      }
    />
  );
};

/* ── Purpose: why this beats a general chatbot. ──
   The demo: the generic answer is written, then corrected in red pen and
   stamped; the Cortex answer is written and its claim marked against the
   source. */

// 1 card · 2 words · 3 struck and stamped · 4 card · 5 words · 6 marked, cited
const WHY_STEPS = [180, 330, 650, 540, 330, 470] as const;

export const WhyCortex = () => {
  const timeline = useTimeline(WHY_STEPS);
  const { on } = timeline;
  return (
    <Section
      id="why-cortex"
      label="Why Cortex"
      title="A generic chatbot guesses. Cortex checks."
      lead="Answers come only from your content, never from the model’s memory."
      figure={
        <DemoFigure
          {...timeline.figure}
          alt="The same question answered twice. A generic chatbot invents a 60-day return window. Cortex answers 30 days and cites the returns policy."
        >
          <div className="flex w-full flex-col gap-4 text-[17px] leading-relaxed">
            <Step on={on(1)} className={`${figureCard} p-6`}>
              <div className="flex items-baseline justify-between">
                <Label className="text-[#4B5468]">Generic chatbot</Label>
                <span
                  data-on={on(3)}
                  className="demo-stamp font-display text-xl text-brand-pen italic"
                >
                  Made up
                </span>
              </div>
              <p className="mt-3 text-brand-ink">
                <Stream on={on(2)} text="Most stores offer" />
                <StreamPart on={on(2)} after={3}>
                  <span data-on={on(3)} className="demo-strike">
                    60 days
                  </span>
                  ,{" "}
                </StreamPart>
                <Stream on={on(2)} after={4} text="so you should be fine!" />
              </p>
            </Step>
            <Step
              on={on(4)}
              className={clsx(figureCard, "p-6", on(6) && "border-brand-teal")}
            >
              <div className="flex items-baseline justify-between">
                <Label className="text-primary-700">Cortex</Label>
                <Step
                  inline
                  on={on(6)}
                  className="font-receipt text-[11px] text-[#4B5468]"
                >
                  Returns policy.pdf, p. 2
                </Step>
              </div>
              <p className="mt-3 text-brand-ink">
                <Stream on={on(5)} text="You have" />
                <StreamPart on={on(5)} after={2}>
                  <Highlight on={on(6)}>30 days from delivery</Highlight>
                </StreamPart>
                <Step inline on={on(6)}>
                  <Cite n={1} />
                </Step>
                <StreamPart on={on(5)} after={3}>
                  .
                </StreamPart>
              </p>
            </Step>
          </div>
        </DemoFigure>
      }
    />
  );
};

/* ── Purpose: show that setup is short. ──
   The demo walks the three steps: the sources index one by one, a test
   question is answered with its citation, the pointer copies the snippet
   and the assistant's button appears on the site. The list on the left and
   the line between the steps follow it. */

const stepBadge =
  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-receipt text-sm transition-[background-color,color,box-shadow,scale] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]";

const SOURCES = [
  { icon: FileText, name: "Returns policy.pdf" },
  { icon: Globe, name: "yourstore.com/shipping" },
  { icon: Type, name: "Size guide (pasted text)" },
];

const SETUP = [
  {
    title: "Add your content",
    detail: "PDFs, pages from your site, or pasted text.",
  },
  {
    title: "Test the answers",
    detail: "Ask real questions and check the sources.",
  },
  {
    title: "Paste one line on your site",
    detail: "The assistant appears for your visitors.",
  },
];

// 1–3 the sources index · 4 question · 5 dots · 6 answer · 7 citation ·
// 8 pointer · 9 copied · 10 live
const SETUP_STEPS = [170, 230, 230, 340, 230, 270, 230, 290, 250, 260] as const;

export const HowItWorks = () => {
  const timeline = useTimeline(SETUP_STEPS);
  const { on } = timeline;
  /** Which of the three steps the demo is on: 0, 1 or 2. */
  const phase = on(8) ? 2 : on(4) ? 1 : 0;
  const done = on(SETUP_STEPS.length);

  const cards = [
    <ul key="sources" className="flex flex-col gap-1.5">
      {SOURCES.map(({ icon: Icon, name }, index) => (
        <li
          key={name}
          className="flex items-center gap-2.5 rounded-md border border-brand-ink/10 px-3 py-1.5"
        >
          <Icon className="h-3.5 w-3.5 shrink-0 text-[#69728A]" />
          <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-brand-ink">
            {name}
          </span>
          <Swap
            on={on(index + 1)}
            from="indexing…"
            to="indexed"
            className="font-receipt text-[10.5px]"
          />
        </li>
      ))}
    </ul>,

    <div key="test" className="flex flex-col gap-2 text-[13px] leading-relaxed">
      <Step
        on={on(4)}
        className="max-w-[85%] self-end rounded-md rounded-br-none bg-primary-700 px-3 py-2 text-white"
      >
        How long do refunds take?
      </Step>
      <Step
        on={on(5)}
        className="relative self-start rounded-md rounded-bl-none bg-brand-mist px-3 py-2 text-brand-ink"
      >
        <Typing on={on(5) && !on(6)} />
        <Stream on={on(6)} text="5–7 business days" />
        <StreamPart on={on(6)} after={3}>
          <Cite n={1} />
        </StreamPart>
      </Step>
      <Step on={on(7)} className="font-receipt text-[10.5px] text-[#4B5468]">
        1 · Returns policy.pdf, page 2
      </Step>
    </div>,

    /* ILLUSTRATIVE: the widget isn't built yet, so the script URL and
       attribute are placeholders. */
    <div key="embed" className="flex flex-col gap-2">
      <div className="rounded-md border border-brand-ink/10 bg-brand-mist p-3">
        <div className="flex items-center justify-between font-receipt text-[10px] text-[#4B5468]">
          <span>Paste before {"</body>"}</span>
          <span className="relative">
            <span
              className={clsx(
                "inline-grid rounded-[3px] border px-1.5 py-0.5 transition-[background-color,border-color,color,scale] duration-200",
                on(9)
                  ? "border-primary-700 bg-primary-700 text-white"
                  : "border-brand-ink/15 bg-white text-brand-ink",
                timeline.during(9) && "scale-95",
              )}
            >
              {/* Both words hold the width, so the chip doesn't jump. */}
              <span
                className={clsx(
                  "col-start-1 row-start-1",
                  on(9) && "invisible",
                )}
              >
                Copy
              </span>
              <span
                className={clsx(
                  "col-start-1 row-start-1",
                  !on(9) && "invisible",
                )}
              >
                Copied
              </span>
            </span>
            <Cursor on={on(8) && !on(10)} press={on(9)} />
          </span>
        </div>
        <pre className="mt-2 font-receipt text-[11px] leading-relaxed wrap-anywhere whitespace-pre-wrap text-brand-ink">
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
        <Step
          inline
          on={on(10)}
          className="rounded-md bg-brand-teal px-3 py-1.5 text-[11px] font-semibold text-brand-ink"
        >
          Ask us anything
        </Step>
      </div>
    </div>,
  ];

  /** A step's number: filled once the demo has reached it. */
  const badge = (index: number) =>
    clsx(
      stepBadge,
      done || index <= phase
        ? "bg-primary-700 text-white"
        : "bg-white text-[#4B5468] shadow-[inset_0_0_0_1px_rgba(18,23,42,0.2)]",
      !done && index === phase && "scale-110",
    );

  return (
    <Section
      id="how-it-works"
      tone="wash"
      pattern="dots"
      label="How it works"
      title="Set up in three steps"
      figure={
        <DemoFigure
          {...timeline.figure}
          alt="Step 1: three sources indexed in the knowledge base. Step 2: a test question answered with a citation. Step 3: one line of code pasted into the store’s website adds the assistant."
        >
          <ol className="w-full">
            {cards.map((card, index) => {
              const last = index === cards.length - 1;
              return (
                <li key={index} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <span className={badge(index)}>{index + 1}</span>
                    {!last && (
                      <span className="relative mt-2 w-px flex-1 bg-brand-ink/15">
                        <span
                          data-on={done || phase > index}
                          className="demo-rail absolute inset-0 bg-primary-700"
                        />
                      </span>
                    )}
                  </div>
                  <div className={clsx("min-w-0 flex-1", !last && "pb-4")}>
                    <div
                      className={clsx(
                        "rounded-lg border bg-white p-4 transition-[border-color,opacity,box-shadow,translate] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
                        !done && index === phase
                          ? "-translate-y-0.5 border-brand-teal shadow-[0_18px_30px_-18px_rgba(18,23,42,0.4)]"
                          : "border-brand-ink/10 shadow-[0_12px_24px_-18px_rgba(18,23,42,0.35)]",
                        !done && index > phase && "opacity-55",
                      )}
                    >
                      {card}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </DemoFigure>
      }
    >
      <ol className="flex flex-col gap-5">
        {SETUP.map((step, index) => (
          <li key={step.title} className="flex gap-4">
            <span className={badge(index)}>{index + 1}</span>
            <div
              className={clsx(
                "transition-opacity duration-500",
                !done && index > phase && "opacity-55",
              )}
            >
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
};

/* ── Purpose: the closing call to action. ──
   The demo: a policy document is carried into the upload area and dropped,
   read, and ready to answer from. */

// 1 the file arrives · 2 dropped, listed · 3 reading · 4 indexed
const UPLOAD_STEPS = [370, 700, 330, 1100] as const;

export const GetStarted = () => {
  const timeline = useTimeline(UPLOAD_STEPS);
  const { on, during } = timeline;
  return (
    <Section
      id="get-started"
      tone="teal"
      pattern="dots-light"
      label="Get started"
      title="Try it with one policy document"
      lead="Upload a file and ask the question your customers ask most."
      figure={
        <DemoFigure
          dark
          {...timeline.figure}
          alt="A policy document is dropped into the upload area, read, and indexed."
        >
          <div className={`${figureCard} p-5`}>
            <div
              className={clsx(
                "relative flex flex-col items-center rounded-md border border-dashed px-6 py-12 text-center transition-[border-color,background-color,scale] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
                during(1)
                  ? "scale-[1.02] border-primary-700 bg-[#E6F7F4]"
                  : "border-brand-ink/25",
              )}
            >
              <FileText className="h-7 w-7 text-primary-700" />
              <p className="mt-3 text-sm font-semibold text-brand-ink">
                Drop a policy document
              </p>
              <p className="mt-1 text-xs text-[#4B5468]">PDF, up to 20 MB</p>

              {/* The file being carried in: it comes from the upper right,
                  hovers, and is let go into the list below. */}
              <span
                className={clsx(
                  "pointer-events-none absolute top-1/2 left-1/2 inline-flex items-center gap-2 rounded-md border border-brand-ink/15 bg-white px-3 py-2 text-xs font-medium text-brand-ink shadow-[0_14px_24px_-12px_rgba(18,23,42,0.45)] transition-[opacity,translate,rotate,scale] ease-[cubic-bezier(0.65,0,0.35,1)]",
                  during(1)
                    ? "-translate-x-1/2 -translate-y-1/2 -rotate-3 opacity-100 duration-700"
                    : on(2)
                      ? "-translate-x-1/2 translate-y-10 scale-90 rotate-0 opacity-0 duration-300"
                      : "translate-x-16 -translate-y-24 rotate-6 opacity-0 duration-200",
                )}
              >
                <FileText className="h-3.5 w-3.5 text-[#69728A]" />
                Returns policy.pdf
                <Cursor on={during(1)} press={false} />
              </span>
            </div>
            <Step
              on={on(2)}
              className="relative mt-3 flex items-center gap-3 overflow-hidden rounded-md border border-brand-ink/10 px-3 py-3"
            >
              <FileText className="h-4 w-4 shrink-0 text-[#69728A]" />
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-brand-ink">
                Returns policy.pdf
              </span>
              <Swap
                on={on(4)}
                from="reading…"
                to="indexed"
                className="font-receipt text-[11px]"
              />
              {/* Progress along the row's bottom edge; gone once indexed. */}
              <span
                data-on={on(3)}
                className={clsx(
                  "demo-progress absolute inset-x-0 bottom-0 h-0.5 bg-brand-teal transition-opacity duration-300",
                  on(4) && "opacity-0",
                )}
              />
            </Step>
          </div>
        </DemoFigure>
      }
    >
      <Link href="/auth/register" className={lightButton}>
        Start free
      </Link>
    </Section>
  );
};
