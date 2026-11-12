"use client";

import {
  Fragment,
  useEffect,
  useReducer,
  useState,
  useSyncExternalStore,
} from "react";
import type { CSSProperties } from "react";
import Image from "next/image";
import { clsx } from "clsx";
import { FileText, Globe, Package } from "lucide-react";
import { Cite, DEMO_PRODUCTS, JacketArt } from "./primitives";

/* ────────────────────────────────────────────────────────────
 * Scripted preview of the visitor-facing assistant: the hero's visual.
 * It is drawn inside a browser window on a store page, so it is clear at a
 * glance that the assistant lives on the customer's own website.
 *
 * It loops through three example conversations: the question is typed,
 * the assistant "thinks", then the answer streams in with its sources.
 * Nothing here talks to the AI service; the content is illustrative.
 *
 * The widget's colour comes from one CSS variable (--chat-accent). It steps
 * through THEMES on its own, and the swatches under the demo pick one.
 * ──────────────────────────────────────────────────────────── */

type Source = { kind: "file" | "web" | "catalog"; label: string };
type Demo = {
  tab: string;
  question: string;
  /** "[1]" style markers become citation chips. */
  answer: string;
  sources: Source[];
  products?: typeof DEMO_PRODUCTS;
};

const DEMOS: Demo[] = [
  {
    tab: "Returns",
    question: "Can I return shoes I’ve already worn outside?",
    answer:
      "Yes, within 30 days of delivery. Worn pairs qualify as long as they’re undamaged and you still have the original box [1]. Refunds go back to your original payment method in 5–7 business days [2].",
    sources: [
      { kind: "file", label: "Returns policy.pdf · page 2" },
      { kind: "web", label: "yourstore.com/help/refunds" },
    ],
  },
  {
    tab: "Shipping",
    question: "Do you ship to Canada, and how long does it take?",
    answer:
      "We do. Standard shipping to Canada takes 6–9 business days and costs $12, or it’s free on orders over $150 [1]. Duties are calculated at checkout, so there’s nothing to pay on delivery [1].",
    sources: [{ kind: "web", label: "yourstore.com/shipping" }],
  },
  {
    tab: "Recommendations",
    question: "A waterproof jacket under $200?",
    answer:
      "These two fit. Both are fully seam-sealed and inside your budget [1].",
    sources: [{ kind: "catalog", label: "Product catalog" }],
    products: DEMO_PRODUCTS,
  },
];

const SOURCE_ICONS = { file: FileText, web: Globe, catalog: Package };

/**
 * Widget colours: the brand colours websites and SaaS products use most, in
 * roughly that order (blue leads by far), so a visitor is likely to find
 * their own. Not Cortex's palette: the widget wears the store's colour.
 * Each is dark enough for white text on top of it (4.5:1 or better).
 */
const THEMES = [
  { name: "Blue", accent: "#2563EB" },
  { name: "Black", accent: "#111827" },
  { name: "Green", accent: "#15803D" },
  { name: "Violet", accent: "#6D28D9" },
  { name: "Red", accent: "#DC2626" },
  { name: "Orange", accent: "#C2410C" },
];

/** How long each colour stays while the colour changes on its own. */
const THEME_INTERVAL_MS = 3600;

/** Fills that follow the widget colour, and fade when it changes. */
const accentFill = "bg-[var(--chat-accent)] transition-colors duration-500";
const accentText = "text-[var(--chat-accent)] transition-colors duration-500";

/** The example store's own logo. It stands in for the customer's brand mark,
    which the widget shows in its header; "Powered by Cortex" sits at the bottom. */
const StoreLogo = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    aria-hidden="true"
    fill="currentColor"
    className={className}
  >
    <path d="M2 19 9.5 6l4 6.9 2-3.4L22 19Z" />
  </svg>
);

type Phase = "typing" | "thinking" | "streaming" | "done";
type State = {
  index: number;
  phase: Phase;
  count: number;
  /** Goes up each time a conversation starts, so its button's fill restarts. */
  run: number;
  /** Shown complete at once (picked while paused): nothing left to time. */
  whole: boolean;
};
type Action =
  { type: "advance" } | { type: "select"; index: number; instant: boolean };

const wordsOf = (demo: Demo) => demo.answer.split(" ");

/** Pacing of the scripted reply, in milliseconds. */
const THINKING_MS = 950;
const WORD_MS = 55;
const SETTLE_MS = 150;

/**
 * Seconds from sending the question to the finished answer, shown under the
 * reply as "Answered in 2.8s". It is the time this scripted demo takes to play,
 * so it matches what the visitor just watched. It is NOT a measurement of the
 * real service: replace it with real figures before quoting it as performance.
 */
const answerSeconds = (demo: Demo) =>
  ((THINKING_MS + wordsOf(demo).length * WORD_MS + SETTLE_MS) / 1000).toFixed(
    1,
  );

function reducer(state: State, action: Action): State {
  if (action.type === "select") {
    return {
      index: action.index,
      phase: action.instant ? "done" : "typing",
      count: 0,
      run: state.run + 1,
      whole: action.instant,
    };
  }
  const demo = DEMOS[state.index];
  switch (state.phase) {
    case "typing":
      return state.count < demo.question.length
        ? { ...state, count: state.count + 1 }
        : { ...state, phase: "thinking", count: 0 };
    case "thinking":
      return { ...state, phase: "streaming", count: 0 };
    case "streaming":
      return state.count < wordsOf(demo).length
        ? { ...state, count: state.count + 1 }
        : { ...state, phase: "done", count: 0 };
    case "done":
      return {
        index: (state.index + 1) % DEMOS.length,
        phase: "typing",
        count: 0,
        run: state.run + 1,
        whole: false,
      };
  }
}

/** How long to stay on the current frame before advancing. */
function delayFor(state: State): number {
  const demo = DEMOS[state.index];
  switch (state.phase) {
    case "typing":
      if (state.count === 0) return 900;
      return state.count === demo.question.length ? 450 : 30;
    case "thinking":
      return THINKING_MS;
    case "streaming":
      return state.count === wordsOf(demo).length ? SETTLE_MS : WORD_MS;
    case "done":
      return 5200;
  }
}

/**
 * How long one conversation plays, from its first frame to the switch to the
 * next one: the sum of every `delayFor` on the way. Its button fills over
 * exactly this time, so the fill tells how long is left.
 */
const totalMs = (index: number) => {
  const demo = DEMOS[index];
  const frame = { index, run: 0, whole: false };
  let total = 0;
  for (let count = 0; count <= demo.question.length; count++)
    total += delayFor({ ...frame, phase: "typing", count });
  for (let count = 0; count <= wordsOf(demo).length; count++)
    total += delayFor({ ...frame, phase: "streaming", count });
  return (
    total +
    delayFor({ ...frame, phase: "thinking", count: 0 }) +
    delayFor({ ...frame, phase: "done", count: 0 })
  );
};

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";
const subscribeReducedMotion = (onChange: () => void) => {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};
const usePrefersReducedMotion = () =>
  useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_MOTION).matches,
    () => false,
  );

/** Renders the streamed words; a "[1]" marker becomes a chip glued to the word before it. */
const AnswerWords = ({ words }: { words: string[] }) => {
  const groups: { text: string; cite?: number; tail?: string }[] = [];
  for (const word of words) {
    const match = /^\[(\d+)\](.*)$/.exec(word);
    const last = groups[groups.length - 1];
    if (match && last) {
      last.cite = Number(match[1]);
      last.tail = match[2];
    } else {
      groups.push({ text: word });
    }
  }
  return (
    <>
      {groups.map((group, i) => (
        <Fragment key={i}>
          {i > 0 && " "}
          {group.cite ? (
            <span className="whitespace-nowrap">
              {group.text}
              <Cite n={group.cite} tone="accent" />
              {group.tail}
            </span>
          ) : (
            group.text
          )}
        </Fragment>
      ))}
    </>
  );
};

export const HeroChatDemo = () => {
  const reducedMotion = usePrefersReducedMotion();
  const [paused, setPaused] = useState(false);
  const [state, dispatch] = useReducer(reducer, {
    index: 0,
    phase: "typing",
    count: 0,
    run: 0,
    whole: false,
  });

  useEffect(() => {
    if (paused || reducedMotion) return;
    const id = setTimeout(() => dispatch({ type: "advance" }), delayFor(state));
    return () => clearTimeout(id);
  }, [state, paused, reducedMotion]);

  // Widget colour: changes on its own until a swatch is picked ("Auto" resumes it).
  const [themeIndex, setThemeIndex] = useState(0);
  const [autoColor, setAutoColor] = useState(true);
  const cycling = autoColor && !paused && !reducedMotion;

  useEffect(() => {
    if (!cycling) return;
    const id = setInterval(
      () => setThemeIndex((index) => (index + 1) % THEMES.length),
      THEME_INTERVAL_MS,
    );
    return () => clearInterval(id);
  }, [cycling]);

  const theme = THEMES[themeIndex];

  // With reduced motion, show each conversation complete and never animate.
  const view: State = reducedMotion ? { ...state, phase: "done" } : state;
  const demo = DEMOS[view.index];
  const words = wordsOf(demo);

  const asked = view.phase !== "typing";
  const typed = asked ? "" : demo.question.slice(0, view.count);
  const shown =
    view.phase === "done"
      ? words
      : view.phase === "streaming"
        ? words.slice(0, view.count)
        : [];
  const done = view.phase === "done";

  return (
    <div
      className="landing-rise"
      style={{ "--rise-delay": "200ms" } as CSSProperties}
    >
      <p className="sr-only">
        Example conversation in a chat widget that carries the store’s own logo
        and the line “Powered by Cortex”. A visitor asks: {demo.question} The
        assistant answers: {demo.answer.replace(/\s*\[\d+\]/g, "")} Sources:{" "}
        {demo.sources.map((source) => source.label).join(", ")}. Answered in{" "}
        {answerSeconds(demo)} seconds.
      </p>

      {/* ── A browser window on the store's site (decorative; described above for screen readers) ── */}
      <div
        aria-hidden="true"
        className="overflow-hidden rounded-xl border border-brand-ink/10 bg-white shadow-[0_24px_48px_-36px_rgba(18,23,42,0.5)]"
      >
        <div className="flex items-center gap-3 border-b border-brand-ink/10 bg-brand-mist px-4 py-2.5">
          <span className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-brand-ink/15" />
            <span className="h-2.5 w-2.5 rounded-full bg-brand-ink/15" />
            <span className="h-2.5 w-2.5 rounded-full bg-brand-ink/15" />
          </span>
          <span className="min-w-0 flex-1 truncate rounded-[5px] border border-brand-ink/10 bg-white px-3 py-1 font-receipt text-[11px] text-[#4B5468]">
            yourstore.com
          </span>
        </div>

        <div
          className="relative p-4 sm:p-6"
          style={{ "--chat-accent": theme.accent } as CSSProperties}
        >
          {/* The store's page, behind the assistant */}
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm font-semibold text-brand-ink">
              <StoreLogo className={`h-5 w-5 ${accentText}`} />
              Your Store
            </span>
            <span className="flex gap-4 text-xs text-[#69728A]">
              <span>Shop</span>
              <span>Help</span>
              <span>Cart</span>
            </span>
          </div>
          <div className="absolute inset-x-6 top-[68px] bottom-6 hidden flex-col gap-3 sm:flex">
            <span className="h-32 rounded-md bg-brand-mist" />
            <span className="h-3 w-40 rounded-sm bg-brand-ink/10" />
            <span className="h-3 w-28 rounded-sm bg-brand-ink/10" />
            <span className="mt-2 h-24 w-28 rounded-md bg-brand-mist" />
            <span className="h-3 w-24 rounded-sm bg-brand-ink/10" />
          </div>

          {/* The assistant, docked to the right like a chat widget */}
          <div className="relative mt-4 ml-auto w-full max-w-[400px] overflow-hidden rounded-lg border border-brand-ink/10 bg-white shadow-[0_18px_36px_-18px_rgba(18,23,42,0.45)]">
            <div
              className={`flex items-center gap-3 px-4 py-3.5 ${accentFill}`}
            >
              {/* The store's logo, not ours */}
              <span className="flex h-8 w-8 items-center justify-center rounded-[5px] bg-white">
                <StoreLogo className={`h-5 w-5 ${accentText}`} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white">
                  Your Store assistant
                </p>
                <p className="text-xs text-white/85">
                  Answers from this store’s policies
                </p>
              </div>
              <span className="font-receipt text-[10px] tracking-[0.1em] text-white/80 uppercase">
                Preview
              </span>
            </div>

            {/* Fixed height so the page never jumps (taller on phones, where lines wrap more);
                older messages fade out at the top. */}
            <div className="flex h-[400px] flex-col justify-end sm:h-[340px] gap-3 overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,#000_40px)] px-4 py-4 text-sm leading-relaxed">
              {/* The greeting gives way to the answer, so nothing is cut off at the top. */}
              {shown.length === 0 && (
                <p className="max-w-[85%] self-start rounded-md rounded-bl-none bg-brand-mist px-3.5 py-2.5 text-brand-ink">
                  Hi! Ask me anything about orders, shipping or returns.
                </p>
              )}

              {asked && (
                <p
                  key={`question-${view.index}`}
                  className={`landing-pop max-w-[85%] self-end rounded-md rounded-br-none px-3.5 py-2.5 text-white ${accentFill}`}
                >
                  {demo.question}
                </p>
              )}

              {view.phase === "thinking" && (
                <span className="landing-pop self-start rounded-md rounded-bl-none bg-brand-mist px-3.5 py-2.5 font-receipt text-xs text-[#4B5468]">
                  Reading your sources…
                </span>
              )}

              {shown.length > 0 && (
                <div
                  key={`answer-${view.index}`}
                  className="flex max-w-[94%] flex-col gap-2.5 self-start"
                >
                  <p className="rounded-md rounded-bl-none bg-brand-mist px-3.5 py-2.5 text-brand-ink">
                    <AnswerWords words={shown} />
                    {!done && (
                      <span
                        className={`ml-0.5 inline-block h-3.5 w-1.5 align-text-bottom ${accentFill}`}
                      />
                    )}
                  </p>

                  {done && demo.products && (
                    <div className="landing-pop flex flex-col gap-1.5">
                      {demo.products.map((product) => (
                        <div
                          key={product.name}
                          className="flex items-center gap-3 rounded-md border border-brand-ink/10 p-2"
                        >
                          <span
                            className="h-10 w-10 shrink-0 rounded-[4px] p-1"
                            style={{ background: product.backdrop }}
                          >
                            <JacketArt
                              color={product.color}
                              shade={product.shade}
                              chestPocket={product.chestPocket}
                            />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-xs font-semibold text-brand-ink">
                              {product.name}
                            </span>
                            <span className="block truncate text-[11px] text-[#4B5468]">
                              {product.detail}
                            </span>
                          </span>
                          <span
                            className={`pr-1 font-receipt text-xs font-medium ${accentText}`}
                          >
                            {product.price}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {done && (
                    <div className="landing-pop flex flex-wrap items-center gap-1.5">
                      {demo.sources.map((source, i) => {
                        const Icon = SOURCE_ICONS[source.kind];
                        return (
                          <span
                            key={source.label}
                            className="inline-flex items-center gap-1.5 rounded-[4px] border border-brand-ink/15 px-2 py-1 text-[11px] text-[#4B5468]"
                          >
                            <span
                              className={`font-receipt font-medium ${accentText}`}
                            >
                              {i + 1}
                            </span>
                            <Icon className="h-3 w-3 text-[#69728A]" />
                            {source.label}
                          </span>
                        );
                      })}
                      {/* How long the reply took */}
                      <span className="ml-auto py-1 pl-1 font-receipt text-[11px] text-[#69728A]">
                        Answered in {answerSeconds(demo)}s
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="border-t border-brand-ink/10 px-3 pt-3 pb-2.5">
              <div className="flex h-11 items-center gap-2 rounded-md bg-brand-mist pr-1.5 pl-3.5">
                <p className="min-w-0 flex-1 truncate text-sm text-brand-ink">
                  {typed || (
                    <span className="text-[#69728A]">Ask a question…</span>
                  )}
                  {typed && (
                    <span
                      className={`ml-px inline-block h-4 w-px align-text-bottom ${accentFill}`}
                    />
                  )}
                </p>
                <span
                  className={`flex h-8 items-center rounded-[4px] px-3 text-xs font-semibold text-white ${accentFill}`}
                >
                  Send
                </span>
              </div>
              <p className="mt-2.5 flex items-center justify-center gap-1.5 text-[11px] text-[#69728A]">
                Powered by
                <span className="inline-flex items-center gap-1 font-semibold text-brand-ink">
                  <Image
                    src="/brand/cortex-cx-mark.svg"
                    alt=""
                    width={12}
                    height={12}
                  />
                  Cortex
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Controls: pick an example, pause the loop ── */}
      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
        <span className="text-[#4B5468]">Try a question:</span>
        <div
          role="group"
          aria-label="Example conversations"
          className="flex flex-wrap gap-2"
        >
          {DEMOS.map((item, index) => {
            const current = index === view.index;
            const timed = !reducedMotion && !view.whole;
            return (
              <button
                key={item.tab}
                type="button"
                aria-pressed={current}
                onClick={() =>
                  dispatch({
                    type: "select",
                    index,
                    instant: paused || reducedMotion,
                  })
                }
                className={clsx(
                  "relative inline-flex h-8 items-center rounded-md border px-3 font-medium transition-colors duration-150",
                  current
                    ? "border-primary-700 bg-white text-brand-ink"
                    : "border-brand-ink/15 bg-white text-[#4B5468] hover:border-brand-ink/40 hover:text-brand-ink",
                )}
              >
                {item.tab}
                {/* The same label in the filled colours, uncovered from the
                    left for as long as this conversation plays. */}
                {current && (
                  <span
                    key={view.run}
                    aria-hidden="true"
                    className={clsx(
                      "absolute -inset-px flex items-center rounded-[inherit] bg-primary-700 px-[calc(0.75rem+1px)] text-white",
                      timed && "demo-fill",
                    )}
                    style={
                      timed
                        ? ({
                            "--fill-ms": `${totalMs(index)}ms`,
                            animationPlayState: paused ? "paused" : "running",
                          } as CSSProperties)
                        : undefined
                    }
                  >
                    {item.tab}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {!reducedMotion && (
          <button
            type="button"
            onClick={() => setPaused((value) => !value)}
            className={`ml-auto inline-flex h-8 items-center rounded-sm text-[#4B5468] underline decoration-current/30 underline-offset-4 transition-colors hover:text-brand-ink`}
          >
            {paused ? "Play" : "Pause"}
            <span className="sr-only"> the demo</span>
          </button>
        )}
      </div>

      {/* ── Controls: pick the widget's colour, or let it change on its own ── */}
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
        <span className="text-[#4B5468]">Widget colour:</span>
        <div
          role="group"
          aria-label="Widget colour"
          className="flex flex-wrap items-center gap-2"
        >
          {THEMES.map((item, index) => {
            const selected = index === themeIndex;
            return (
              <button
                key={item.name}
                type="button"
                aria-label={item.name}
                aria-pressed={selected}
                title={item.name}
                onClick={() => {
                  setThemeIndex(index);
                  setAutoColor(false);
                }}
                className={clsx(
                  "h-7 w-7 rounded-full border-2 border-white transition-shadow duration-150",
                  selected
                    ? "shadow-[0_0_0_2px_var(--swatch)]"
                    : "shadow-[0_0_0_1px_rgba(18,23,42,0.15)] hover:shadow-[0_0_0_2px_rgba(18,23,42,0.3)]",
                )}
                style={
                  {
                    background: item.accent,
                    "--swatch": item.accent,
                  } as CSSProperties
                }
              />
            );
          })}
        </div>

        {!reducedMotion && (
          <button
            type="button"
            aria-pressed={autoColor}
            onClick={() => setAutoColor((value) => !value)}
            className={clsx(
              "inline-flex h-8 items-center rounded-md border px-3 font-medium transition-colors duration-150",
              autoColor
                ? "border-primary-700 bg-primary-700 text-white"
                : "border-brand-ink/15 bg-white text-[#4B5468] hover:border-brand-ink/40 hover:text-brand-ink",
            )}
          >
            Auto
            <span className="sr-only"> colour change</span>
          </button>
        )}
      </div>
    </div>
  );
};
