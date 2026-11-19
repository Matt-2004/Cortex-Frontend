"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import { ArrowUp, BookOpen, Loader2, RotateCcw, Square } from "lucide-react";
import { SignedIn } from "@/app/features/console/ui/ConsoleShell";
import { Skeleton } from "@/app/features/console/ui/consoleUi";
import { AiApiError, listSources, streamChat } from "../api/aiApi";
import { markChatTried } from "../utils/chatTried";
import type { ChatTurn, KnowledgeSource } from "../types/ai.types";
import { ChatMessage, type UiMessage } from "./ChatMessage";

const newId = () =>
  `m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

/** /console/chat — try the assistant on your own knowledge base. */
export const ChatPanel = () => (
  <SignedIn
    fallback={
      <div className="flex min-h-0 flex-1 flex-col">
        <ChatHeader />
        <div className="mx-auto w-full max-w-4xl flex-1 px-5 py-8 sm:px-8">
          <Skeleton className="h-24 w-full rounded-card" />
        </div>
      </div>
    }
  >
    <Chat />
  </SignedIn>
);

/**
 * What a good answer looks like, shown before the first question: a short
 * reply with a numbered citation and the document it came from. It is set
 * slightly askew, like a note pinned to the page — a sample, not a message.
 */
const AnswerSpecimen = ({ source }: { source: string | null }) => (
  <figure
    aria-label="Example of an answer with its source"
    className="mb-2 w-[min(100%,320px)] -rotate-[1.5deg] rounded-box border border-brand-ink/10 bg-white p-4 text-left shadow-[0_14px_28px_-22px_rgba(18,23,42,0.5)] motion-reduce:rotate-0"
  >
    <p className="text-[13px] leading-relaxed text-brand-ink">
      Answers quote your documents
      <span className="mx-1 inline-flex h-4 min-w-4 -translate-y-px items-center justify-center rounded-badge bg-primary-100 px-1 align-middle text-[10px] font-semibold text-primary-800">
        1
      </span>
      and say so when something isn&rsquo;t covered.
    </p>
    <figcaption className="mt-3 flex items-center gap-2 border-t border-dashed border-brand-ink/20 pt-2.5 font-receipt text-[11px] text-brand-ink-muted">
      <span className="font-semibold text-primary-800">1</span>
      <span className="truncate">{source ?? "your-returns-policy.pdf"}</span>
    </figcaption>
  </figure>
);

/** Compact version of the console's page band, so the conversation keeps its height. */
const ChatHeader = ({
  description,
  actions,
}: {
  description?: ReactNode;
  actions?: ReactNode;
}) => (
  <div className="shrink-0 border-b border-brand-ink/10 bg-brand-wash">
    <div className="mx-auto flex w-full max-w-[1200px] flex-wrap items-center justify-between gap-x-6 gap-y-3 px-5 py-5 sm:px-8 sm:py-6">
      <div className="min-w-0">
        <h1 className="font-display font-heading text-[28px] leading-[1.1] tracking-[-0.015em] sm:text-[32px]">
          Chat
        </h1>
        <p className="mt-1.5 text-sm text-brand-ink-muted">
          {description ?? "Try your assistant the way visitors will."}
        </p>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  </div>
);

const Chat = () => {
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [withRecommendations, setWithRecommendations] = useState(false);
  const [sources, setSources] = useState<KnowledgeSource[] | null>(null);
  const [announcement, setAnnouncement] = useState("");

  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const stickToBottomRef = useRef(true);

  // Know whether there's anything to answer from (for the empty state).
  useEffect(() => {
    listSources()
      .then(setSources)
      .catch(() => setSources([]));
  }, []);

  // Keep the newest text in view, unless the user scrolled up to read.
  useEffect(() => {
    const el = scrollRef.current;
    if (el && stickToBottomRef.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  // Stop any in-flight answer when leaving the page.
  useEffect(() => () => abortRef.current?.abort(), []);

  const updateMessage = (
    id: string,
    patch: (m: UiMessage) => Partial<UiMessage>,
  ) =>
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, ...patch(m) } : m)),
    );

  const send = async (text: string) => {
    const question = text.trim();
    if (!question || streaming) return;

    // Conversation so far (only finished turns) gives the assistant context.
    const history: ChatTurn[] = messages
      .filter((m) => m.status === "done" && m.content)
      .map((m) => ({ role: m.role, content: m.content }));

    const userMsg: UiMessage = {
      id: newId(),
      role: "user",
      content: question,
      status: "done",
    };
    const botId = newId();
    setMessages((prev) => [
      ...prev,
      userMsg,
      { id: botId, role: "assistant", content: "", status: "streaming" },
    ]);
    setInput("");
    setStreaming(true);
    setAnnouncement("Assistant is answering…");
    stickToBottomRef.current = true;

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      await streamChat(
        {
          message: question,
          history,
          include_recommendations: withRecommendations,
        },
        {
          onSources: (s) => updateMessage(botId, () => ({ sources: s })),
          onToken: (t) =>
            updateMessage(botId, (m) => ({ content: m.content + t })),
          onRecommendations: (r) =>
            updateMessage(botId, () => ({ recommendations: r })),
          onDone: ({ grounded }) => updateMessage(botId, () => ({ grounded })),
        },
        controller.signal,
      );
      updateMessage(botId, (m) => ({
        status: "done",
        content: m.content.trim(),
      }));
      markChatTried();
      setAnnouncement("Answer ready.");
    } catch (error) {
      if ((error as Error).name === "AbortError") {
        updateMessage(botId, (m) => ({
          status: "done",
          content: m.content ? `${m.content.trim()} …` : "Stopped.",
        }));
        setAnnouncement("Stopped.");
      } else {
        const message =
          error instanceof AiApiError
            ? error.message
            : "The assistant couldn't answer. Please try again.";
        updateMessage(botId, () => ({ status: "error", error: message }));
        setAnnouncement(message);
      }
    } finally {
      abortRef.current = null;
      setStreaming(false);
      inputRef.current?.focus();
    }
  };

  const suggestions = (sources ?? [])
    .slice(0, 2)
    .map((s) => `What does “${s.title ?? s.source_id}” cover?`)
    .concat("What is your refund policy?");

  const noDocuments = sources !== null && sources.length === 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ChatHeader
        description={
          <>
            Try your assistant the way visitors will. Answers come only from
            your{" "}
            <Link
              href="/console/knowledge"
              className="font-medium text-primary-700 underline decoration-current/30 underline-offset-4 hover:decoration-current"
            >
              knowledge base
            </Link>
            {sources
              ? ` (${sources.length} document${sources.length === 1 ? "" : "s"})`
              : ""}
            .
          </>
        }
        actions={
          <>
            <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-control border border-brand-ink/15 bg-white px-3 text-sm font-medium text-brand-ink-muted">
              <input
                type="checkbox"
                checked={withRecommendations}
                onChange={(e) => setWithRecommendations(e.target.checked)}
                className="h-3.5 w-3.5 accent-primary-700"
              />
              Recommendations
            </label>
            <button
              type="button"
              onClick={() => {
                abortRef.current?.abort();
                setMessages([]);
                setAnnouncement("Conversation cleared.");
              }}
              disabled={messages.length === 0}
              className="inline-flex h-9 items-center gap-1.5 rounded-control border border-brand-ink/15 bg-white px-3 text-sm font-medium text-brand-ink transition-colors hover:bg-brand-wash disabled:opacity-50"
            >
              <RotateCcw aria-hidden="true" className="h-3.5 w-3.5" />
              New chat
            </button>
          </>
        }
      />

      <div className="mx-auto flex min-h-0 w-full max-w-4xl flex-1 flex-col px-5 sm:px-8">
        {/* Conversation */}
        <div
          ref={scrollRef}
          onScroll={(e) => {
            const el = e.currentTarget;
            stickToBottomRef.current =
              el.scrollHeight - el.scrollTop - el.clientHeight < 80;
          }}
          className="min-h-0 flex-1 overflow-y-auto py-6"
        >
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
              <AnswerSpecimen source={sources?.[0]?.title ?? null} />
              {sources === null ? (
                <p className="flex items-center gap-2 text-sm text-brand-ink-muted">
                  <Loader2
                    aria-hidden="true"
                    className="h-4 w-4 animate-spin"
                  />{" "}
                  Loading…
                </p>
              ) : noDocuments ? (
                <>
                  <p className="max-w-sm text-sm text-brand-ink-muted">
                    Your knowledge base is empty, so the assistant has nothing
                    to answer from yet.
                  </p>
                  <Link
                    href="/console/knowledge"
                    className="inline-flex items-center gap-2 rounded-control bg-brand-teal px-4 py-2 text-sm font-semibold text-brand-ink hover:bg-primary-400"
                  >
                    <BookOpen aria-hidden="true" className="h-4 w-4" />
                    Add documents
                  </Link>
                </>
              ) : (
                <>
                  <p className="text-sm text-brand-ink-muted">
                    Ask anything your documents cover.
                  </p>
                  <ul className="flex max-w-xl flex-wrap justify-center gap-2">
                    {suggestions.map((s) => (
                      <li key={s}>
                        <button
                          type="button"
                          onClick={() => void send(s)}
                          className="rounded-full border border-brand-ink/15 px-3 py-1.5 text-xs text-brand-ink-muted transition-colors hover:border-primary-700/50 hover:text-brand-ink"
                        >
                          {s}
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          ) : (
            <div
              role="log"
              aria-label="Conversation"
              className="flex flex-col gap-5"
            >
              {messages.map((m) => (
                <ChatMessage key={m.id} message={m} />
              ))}
            </div>
          )}
        </div>

        {/* Screen-reader updates without reading every streamed token */}
        <p role="status" className="sr-only">
          {announcement}
        </p>

        {/* Composer */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
          className="shrink-0 pb-5"
        >
          <div
            className={clsx(
              "flex items-end gap-2 rounded-box border bg-white p-2 transition-colors",
              "border-brand-ink/15 focus-within:border-primary-700 focus-within:shadow-[0_0_0_3px_rgba(0,171,143,0.22)]",
            )}
          >
            <label htmlFor="chat-input" className="sr-only">
              Ask a question
            </label>
            <textarea
              id="chat-input"
              ref={inputRef}
              value={input}
              rows={1}
              maxLength={2000}
              placeholder={
                noDocuments
                  ? "Add documents first to start chatting"
                  : "Ask a question…"
              }
              onChange={(e) => {
                setInput(e.target.value);
                // Grow with the text, up to ~6 lines.
                e.target.style.height = "auto";
                e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
              }}
              onKeyDown={(e) => {
                if (
                  e.key === "Enter" &&
                  !e.shiftKey &&
                  !e.nativeEvent.isComposing
                ) {
                  e.preventDefault();
                  void send(input);
                }
              }}
              className="max-h-40 min-h-[40px] flex-1 resize-none bg-transparent px-2 py-2 text-sm text-brand-ink placeholder:text-brand-ink-subtle focus:outline-none focus-visible:outline-none"
            />
            {streaming ? (
              <button
                type="button"
                onClick={() => abortRef.current?.abort()}
                aria-label="Stop answering"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-brand-mist text-brand-ink hover:bg-brand-ink/10"
              >
                <Square aria-hidden="true" className="h-4 w-4 fill-current" />
              </button>
            ) : (
              <button
                type="submit"
                aria-label="Send"
                disabled={!input.trim()}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-brand-teal text-brand-ink transition-colors hover:bg-primary-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ArrowUp aria-hidden="true" className="h-4 w-4" />
              </button>
            )}
          </div>
          <p className="mt-2 text-center text-[11px] text-brand-ink-subtle">
            Enter to send · Shift + Enter for a new line · Answers can be wrong;
            check the cited sources.
          </p>
        </form>
      </div>
    </div>
  );
};
