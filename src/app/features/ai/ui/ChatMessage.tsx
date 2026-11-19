"use client";

import { Fragment, useState } from "react";
import { clsx } from "clsx";
import { AlertTriangle, ChevronDown, ExternalLink, Info } from "lucide-react";
import type { ChatRecommendation, ChatSource } from "../types/ai.types";

export interface UiMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  status: "streaming" | "done" | "error";
  sources?: ChatSource[];
  recommendations?: ChatRecommendation[];
  grounded?: boolean;
  error?: string;
}

/** Renders "[1]" / "[2][3]" citations as small links to the message's sources. */
const AnswerText = ({
  text,
  sourceCount,
  onCite,
}: {
  text: string;
  sourceCount: number;
  onCite: (n: number) => void;
}) => {
  const parts = text.split(/(\[\d+\])/g);
  return (
    <>
      {parts.map((part, i) => {
        const match = /^\[(\d+)\]$/.exec(part);
        const n = match ? Number(match[1]) : 0;
        if (!match || n < 1 || n > sourceCount)
          return <Fragment key={i}>{part}</Fragment>;
        return (
          <button
            key={i}
            type="button"
            onClick={() => onCite(n)}
            aria-label={`Show source ${n}`}
            className="mx-0.5 inline-flex h-4 min-w-4 -translate-y-0.5 items-center justify-center rounded-badge bg-primary-100 px-1 align-middle text-[10px] font-semibold text-primary-800 hover:bg-primary-200"
          >
            {n}
          </button>
        );
      })}
    </>
  );
};

const formatPrice = (price: number | null, currency: string | null) => {
  if (price == null) return null;
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency || "USD",
    }).format(price);
  } catch {
    return `${price}`;
  }
};

export const ChatMessage = ({ message }: { message: UiMessage }) => {
  const [showSources, setShowSources] = useState(false);
  const [citedSource, setCitedSource] = useState<number | null>(null);

  const cite = (n: number) => {
    setShowSources(true);
    setCitedSource(n);
    // Wait for the list to render, then bring the cited source into view.
    requestAnimationFrame(() =>
      document
        .getElementById(`${message.id}-source-${n}`)
        ?.scrollIntoView({ behavior: "smooth", block: "nearest" }),
    );
  };

  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <p className="max-w-[85%] rounded-box rounded-br-badge bg-primary-700 px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap text-white sm:max-w-[75%]">
          <span className="sr-only">You: </span>
          {message.content}
        </p>
      </div>
    );
  }

  const sources = message.sources ?? [];
  const recs = message.recommendations ?? [];
  const streaming = message.status === "streaming";

  return (
    <article
      aria-busy={streaming}
      className="flex max-w-[92%] flex-col gap-2.5 sm:max-w-[80%]"
    >
      <div className="rounded-box rounded-bl-badge border border-brand-ink/10 bg-white px-4 py-3 text-sm leading-relaxed text-brand-ink">
        <span className="sr-only">Assistant: </span>
        {message.content ? (
          <p className="whitespace-pre-wrap">
            <AnswerText
              text={message.content}
              sourceCount={sources.length}
              onCite={cite}
            />
            {streaming && (
              <span
                aria-hidden="true"
                className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-primary-700 align-text-bottom"
              />
            )}
          </p>
        ) : streaming ? (
          <span
            className="flex items-center gap-1.5 py-1"
            aria-label="Thinking"
          >
            {[0, 150, 300].map((delay) => (
              <span
                key={delay}
                aria-hidden="true"
                className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand-ink-faint"
                style={{ animationDelay: `${delay}ms` }}
              />
            ))}
          </span>
        ) : null}

        {message.status === "error" && (
          <p
            role="alert"
            className="mt-2 flex items-start gap-2 text-[#B42318]"
          >
            <AlertTriangle
              aria-hidden="true"
              className="mt-0.5 h-4 w-4 shrink-0 text-[#B42318]"
            />
            {message.error}
          </p>
        )}

        {message.status === "done" && message.grounded === false && (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-brand-ink-subtle">
            <Info aria-hidden="true" className="h-3.5 w-3.5" />
            Nothing in the knowledge base matched this question, so no AI answer
            was generated.
          </p>
        )}
      </div>

      {sources.length > 0 && (
        <div className="text-xs">
          <button
            type="button"
            onClick={() => setShowSources((v) => !v)}
            aria-expanded={showSources}
            aria-controls={`${message.id}-sources`}
            className="inline-flex items-center gap-1 rounded-badge px-1 py-0.5 font-medium text-brand-ink-muted hover:text-brand-ink"
          >
            <ChevronDown
              aria-hidden="true"
              className={clsx(
                "h-3.5 w-3.5 transition-transform",
                showSources && "rotate-180",
              )}
            />
            {sources.length} source{sources.length === 1 ? "" : "s"}
          </button>
          <ol
            id={`${message.id}-sources`}
            hidden={!showSources}
            className="mt-2 flex flex-col gap-2"
          >
            {sources.map((s) => (
              <li
                key={s.index}
                id={`${message.id}-source-${s.index}`}
                className={clsx(
                  "rounded-control border bg-white px-3 py-2 transition-colors",
                  citedSource === s.index
                    ? "border-primary-700/60"
                    : "border-brand-ink/10",
                )}
              >
                <p className="flex items-center gap-2 font-medium text-brand-ink">
                  <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-badge bg-primary-100 px-1 text-[10px] font-semibold text-primary-800">
                    {s.index}
                  </span>
                  <span className="truncate">{s.title}</span>
                  {s.page && (
                    <span className="shrink-0 text-brand-ink-subtle">p. {s.page}</span>
                  )}
                  <span className="ml-auto shrink-0 tabular-nums text-brand-ink-subtle">
                    {Math.round(s.score * 100)}% match
                  </span>
                </p>
                <p className="mt-1 line-clamp-3 text-brand-ink-muted">{s.snippet}</p>
              </li>
            ))}
          </ol>
        </div>
      )}

      {recs.length > 0 && (
        <section
          aria-label="Recommended for you"
          className="flex flex-col gap-2"
        >
          <p className="text-xs font-medium text-brand-ink-muted">Recommended</p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {recs.map(({ item, reason }) => {
              const price = formatPrice(item.price, item.currency);
              const content = (
                <>
                  <span className="flex items-start justify-between gap-2">
                    <span className="font-medium text-brand-ink">
                      {item.title}
                    </span>
                    {price && (
                      <span className="shrink-0 tabular-nums text-primary-700">
                        {price}
                      </span>
                    )}
                  </span>
                  {item.description && (
                    <span className="mt-0.5 line-clamp-2 block text-brand-ink-muted">
                      {item.description}
                    </span>
                  )}
                  <span className="mt-1 block text-[11px] text-brand-ink-subtle">
                    {reason}
                  </span>
                </>
              );
              return (
                <li key={item.id}>
                  {item.url ? (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="group block rounded-control border border-brand-ink/15 bg-white px-3 py-2 text-xs transition-colors hover:border-primary-700/50"
                    >
                      {content}
                      <ExternalLink
                        aria-hidden="true"
                        className="mt-1 h-3 w-3 text-brand-ink-subtle group-hover:text-primary-700"
                      />
                    </a>
                  ) : (
                    <div className="rounded-control border border-brand-ink/15 bg-white px-3 py-2 text-xs">
                      {content}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </article>
  );
};
