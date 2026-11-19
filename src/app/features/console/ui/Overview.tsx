"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import { Check, Plus } from "lucide-react";
import { AiApiError, listSources } from "@/app/features/ai/api/aiApi";
import type {
  KnowledgeSource,
  SourceType,
} from "@/app/features/ai/types/ai.types";
import {
  hasTriedChat,
  subscribeChatTried,
} from "@/app/features/ai/utils/chatTried";
import { relativeTime } from "@/app/features/ai/utils/relativeTime";
import { Container } from "@/app/features/landing/ui/primitives";
import { organizationsApi } from "@/app/features/organizations/api/organizationsApi";
import { useResource } from "@/app/features/console/hooks/useResource";
import { PageHeader, SignedIn } from "@/app/features/console/ui/ConsoleShell";
import {
  EmptyTableRow,
  Panel,
  Skeleton,
  SkeletonRows,
  buttonPrimary,
  buttonSecondary,
  mutedText,
  rowLook,
  tableLook,
  tdLook,
  textLink,
  thLook,
} from "@/app/features/console/ui/consoleUi";

/* ────────────────────────────────────────────────────────────
 * /console — the console's home.
 *
 * One job: show whether the assistant can answer and what it answers from.
 * A one-line status under the title, two plain stats, the latest documents.
 * A setup checklist shows only until setup is done. "Add content" exists
 * once, in the header.
 * ──────────────────────────────────────────────────────────── */

const ORGANIZATIONS_PATH = "/console/organizations";
const KNOWLEDGE_PATH = "/console/knowledge";
const CHAT_PATH = "/console/chat";

const RECENT_LIMIT = 5;

type Sources =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: KnowledgeSource[] };

const SOURCE_TYPES: { type: SourceType; label: string }[] = [
  { type: "file", label: "File" },
  { type: "url", label: "Web page" },
  { type: "text", label: "Pasted text" },
];

const typeLabel = (type: SourceType | null) =>
  (
    SOURCE_TYPES.find((entry) => entry.type === (type ?? "file")) ??
    SOURCE_TYPES[0]
  ).label;

const status = (sources: Sources) => {
  if (sources.status === "error") {
    return `The knowledge base didn’t answer: ${sources.message}`;
  }
  if (sources.status === "ready" && sources.data.length === 0) {
    return "Add your policies, FAQs or product pages so your assistant can answer visitors.";
  }
  if (sources.status === "ready") {
    return "Your assistant is ready to answer visitors.";
  }
  return null;
};

// ─── Header ──────────────────────────────────────────────────────────

const OverviewHeader = ({
  sources,
  onRetry,
}: {
  sources: Sources;
  onRetry?: () => void;
}) => {
  const text = status(sources);
  return (
    <PageHeader
      title="Overview"
      description={text ?? <Skeleton className="h-5 w-80 max-w-full" />}
      actions={
        <>
          {sources.status === "error" && onRetry && (
            <button type="button" onClick={onRetry} className={buttonSecondary}>
              Try again
            </button>
          )}
          <Link href={KNOWLEDGE_PATH} className={buttonPrimary}>
            <Plus aria-hidden="true" className="h-4 w-4" />
            Add content
          </Link>
        </>
      }
    />
  );
};

// ─── Page ────────────────────────────────────────────────────────────

const Body = ({ children }: { children: React.ReactNode }) => (
  <Container className="pt-8 pb-12">
    <div className="@container flex flex-col gap-6">{children}</div>
  </Container>
);

export const Overview = () => (
  <SignedIn
    fallback={
      // The real blocks in their loading state, so nothing jumps afterwards.
      <>
        <OverviewHeader sources={{ status: "loading" }} />
        <Body>
          <Stats sources={{ status: "loading" }} />
          <RecentDocuments sources={{ status: "loading" }} />
        </Body>
      </>
    }
  >
    <OverviewContent />
  </SignedIn>
);

const OverviewContent = () => {
  const [sources, setSources] = useState<Sources>({ status: "loading" });

  const loadSources = useCallback(async () => {
    try {
      const data = await listSources();
      setSources({ status: "ready", data });
    } catch (error) {
      setSources({
        status: "error",
        message:
          error instanceof AiApiError
            ? error.message
            : "Couldn’t reach the knowledge base.",
      });
    }
  }, []);

  useEffect(() => {
    void loadSources();
  }, [loadSources]);

  const retrySources = () => {
    setSources({ status: "loading" });
    void loadSources();
  };

  // Only for the setup step "Create an organization".
  const loadOrganizations = useCallback(
    (signal: AbortSignal) => organizationsApi.list(signal),
    [],
  );
  const { resource: organizations } = useResource(loadOrganizations);

  const chatTried = useSyncExternalStore(
    subscribeChatTried,
    hasTriedChat,
    () => false,
  );

  const loading =
    organizations.status === "loading" || sources.status === "loading";
  const steps = setupSteps({
    hasOrganization:
      organizations.status === "ready" && organizations.data.length > 0,
    hasContent: sources.status === "ready" && sources.data.length > 0,
    chatTried,
  });
  const setupOpen = !loading && steps.some((step) => !step.done);

  return (
    <>
      <OverviewHeader sources={sources} onRetry={retrySources} />
      <Body>
        {setupOpen && <SetupPanel steps={steps} />}
        <Stats sources={sources} />
        <RecentDocuments sources={sources} />
      </Body>
    </>
  );
};

// ─── Stats ───────────────────────────────────────────────────────────

const Stat = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <Panel className="px-5 py-4">
    <dt className={clsx("text-sm", mutedText)}>{label}</dt>
    <dd className="mt-1 text-2xl font-semibold tabular-nums">{value}</dd>
  </Panel>
);

const Stats = ({ sources }: { sources: Sources }) => {
  const docs = sources.status === "ready" ? sources.data : null;
  const latest = docs ? Math.max(0, ...docs.map((s) => s.ingested_at ?? 0)) : 0;
  const placeholder =
    sources.status === "loading" ? <Skeleton className="h-8 w-20" /> : "—";

  return (
    <dl className="grid gap-4 @xl:grid-cols-2">
      <Stat
        label="Documents"
        value={docs ? docs.length.toLocaleString() : placeholder}
      />
      <Stat
        label="Last added"
        value={docs ? (latest ? relativeTime(latest) : "Never") : placeholder}
      />
    </dl>
  );
};

// ─── Recent documents ────────────────────────────────────────────────

const DOCUMENT_COLUMNS = ["w-full", "hidden @xl:table-cell", ""];

const RecentDocuments = ({ sources }: { sources: Sources }) => {
  const docs = sources.status === "ready" ? sources.data : null;
  const recent = docs
    ? [...docs]
        .sort((a, b) => (b.ingested_at ?? 0) - (a.ingested_at ?? 0))
        .slice(0, RECENT_LIMIT)
    : [];

  return (
    <Panel className="min-w-0 overflow-hidden">
      <section aria-labelledby="recent-documents">
        <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <h2 id="recent-documents" className="text-base font-semibold">
            Recent documents
          </h2>
          {docs && docs.length > 0 && (
            <Link
              href={KNOWLEDGE_PATH}
              className={clsx(textLink, "-my-2 py-2 text-sm")}
            >
              View all
            </Link>
          )}
        </div>
        <table className={tableLook}>
          <thead>
            <tr>
              <th scope="col" className={clsx(thLook, "w-full")}>
                Name
              </th>
              <th scope="col" className={clsx(thLook, "hidden @xl:table-cell")}>
                Type
              </th>
              <th scope="col" className={clsx(thLook, "text-right")}>
                Added
              </th>
            </tr>
          </thead>
          <tbody aria-busy={sources.status === "loading"}>
            {sources.status === "loading" && (
              <SkeletonRows columns={DOCUMENT_COLUMNS} />
            )}

            {/* The header offers "Try again": not repeated here. */}
            {sources.status === "error" && (
              <EmptyTableRow colSpan={3} title="Documents could not be loaded">
                {sources.message}
              </EmptyTableRow>
            )}

            {docs && recent.length === 0 && (
              <EmptyTableRow colSpan={3} title="No documents yet">
                Use{" "}
                <span className="font-medium text-brand-ink">Add content</span>{" "}
                at the top of this page.
              </EmptyTableRow>
            )}

            {recent.map((source, index) => (
              <tr
                key={source.source_id}
                style={{ "--row": index } as React.CSSProperties}
                className={clsx("console-row-in", rowLook)}
              >
                {/* max-w-0 lets the title truncate instead of widening the table. */}
                <td className={clsx(tdLook, "w-full max-w-0")}>
                  <p className="truncate font-medium">
                    {source.title || source.source_id}
                  </p>
                  <p className={clsx("mt-0.5 text-xs @xl:hidden", mutedText)}>
                    {typeLabel(source.source_type)}
                  </p>
                </td>
                <td
                  className={clsx(
                    tdLook,
                    "hidden whitespace-nowrap @xl:table-cell",
                    mutedText,
                  )}
                >
                  {typeLabel(source.source_type)}
                </td>
                <td
                  className={clsx(
                    tdLook,
                    "text-right whitespace-nowrap",
                    mutedText,
                  )}
                >
                  {relativeTime(source.ingested_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </Panel>
  );
};

// ─── Setup ───────────────────────────────────────────────────────────

type SetupStep = {
  done: boolean;
  title: string;
  href: string;
  action: string;
};

const setupSteps = ({
  hasOrganization,
  hasContent,
  chatTried,
}: {
  hasOrganization: boolean;
  hasContent: boolean;
  chatTried: boolean;
}): SetupStep[] => [
  {
    done: hasOrganization,
    title: "Create an organization",
    href: ORGANIZATIONS_PATH,
    action: "Create",
  },
  {
    done: hasContent,
    title: "Add your content",
    href: KNOWLEDGE_PATH,
    action: "Add",
  },
  {
    done: chatTried,
    title: "Test the answers in chat",
    href: CHAT_PATH,
    action: "Open chat",
  },
];

/** A checklist to tick off, shown only until every step is done. */
const SetupPanel = ({ steps }: { steps: SetupStep[] }) => {
  const completed = steps.filter((step) => step.done).length;

  return (
    <Panel className="min-w-0">
      <section aria-labelledby="setup" className="px-4 pt-4 pb-1 sm:px-6">
        <div className="flex items-baseline justify-between gap-4">
          <h2 id="setup" className="text-base font-semibold">
            Get set up
          </h2>
          <p className={clsx("text-sm tabular-nums", mutedText)}>
            {completed} of {steps.length} done
          </p>
        </div>
        <ol className="mt-2 divide-y divide-brand-ink/10">
          {steps.map((step) => (
            <li key={step.title} className="flex items-center gap-3 py-3">
              <span
                aria-hidden="true"
                className={clsx(
                  "flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full",
                  step.done
                    ? "bg-primary-700 text-white"
                    : "border border-brand-ink/30",
                )}
              >
                {step.done && <Check className="h-3 w-3" strokeWidth={3} />}
              </span>
              <p
                className={clsx(
                  "min-w-0 flex-1 text-sm",
                  step.done ? "text-brand-ink-subtle line-through" : "font-medium",
                )}
              >
                {step.title}
                <span className="sr-only">
                  {step.done ? " (done)" : " (to do)"}
                </span>
              </p>
              {!step.done && (
                <Link
                  href={step.href}
                  aria-label={`${step.action}: ${step.title}`}
                  className={clsx(textLink, "-my-2 shrink-0 py-2 text-sm")}
                >
                  {step.action}
                </Link>
              )}
            </li>
          ))}
        </ol>
      </section>
    </Panel>
  );
};
