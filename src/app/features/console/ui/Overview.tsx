"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import { Check, MessageSquare, Plus } from "lucide-react";
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
import {
  useResource,
  type Resource,
} from "@/app/features/console/hooks/useResource";
import {
  canManage,
  type Organization,
} from "@/app/features/organizations/types/organization.types";
import {
  PageHeader,
  SignedIn,
  canSeeOrganizations,
  useOrganizationAccess,
} from "@/app/features/console/ui/ConsoleShell";
import {
  EmptyTableRow,
  Panel,
  RoleBadge,
  SideNote,
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
 * It answers the questions a store owner opens the console with, in the order
 * the eye scans (top-left first): can my assistant answer yet, what does it
 * know, what should I do next.
 *
 * The verdict is the page's headline, so it is said once. Under it sits one
 * sheet that rises into the header band: the count of what the assistant
 * knows, itemised like a receipt, torn off above the latest documents. What
 * supports it (setup, organizations) stays unboxed beside it and starts lower,
 * below the band. "Add content" exists once, in the header.
 *
 * The layout follows the width of the content column (container queries), not
 * the viewport: the sidebar takes 256px of it from `lg` up.
 * ──────────────────────────────────────────────────────────── */

const ORGANIZATIONS_PATH = "/console/organizations";
const KNOWLEDGE_PATH = "/console/knowledge";
const CHAT_PATH = "/console/chat";

type Sources =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: KnowledgeSource[] };

const SOURCE_TYPES: {
  type: SourceType;
  /** Short code shown in the table, like a line on a receipt. */
  code: string;
  label: string;
  plural: string;
}[] = [
  { type: "file", code: "File", label: "File", plural: "Files" },
  { type: "url", code: "Web", label: "Web page", plural: "Web pages" },
  { type: "text", code: "Text", label: "Pasted text", plural: "Pasted text" },
];

const sourceType = (type: SourceType | null) =>
  SOURCE_TYPES.find((entry) => entry.type === (type ?? "file")) ??
  SOURCE_TYPES[0];

/** "acme.example" from a source's URL; null when it has none. */
const hostOf = (url: string | null) => {
  if (!url) return null;
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return null;
  }
};

const plural = (n: number, one: string, many = `${one}s`) =>
  `${n.toLocaleString()} ${n === 1 ? one : many}`;

// ─── The verdict ─────────────────────────────────────────────────────

type Tone = "loading" | "ok" | "warning" | "error";

const toneOf = (sources: Sources): Tone =>
  sources.status === "loading"
    ? "loading"
    : sources.status === "error"
      ? "error"
      : sources.data.length === 0
        ? "warning"
        : "ok";

const verdict = (sources: Sources) => {
  if (sources.status === "error") {
    return {
      title: "Your assistant’s status is unavailable",
      detail: `The knowledge base didn’t answer: ${sources.message} Try again in a moment.`,
    };
  }
  if (sources.status === "ready" && sources.data.length === 0) {
    return {
      title: "Your assistant has nothing to answer from",
      detail:
        "Add your policies, FAQs or product pages and it can start answering visitors.",
    };
  }
  if (sources.status === "ready") {
    return {
      title: "Your assistant is ready to answer",
      detail: `Visitors get answers from ${plural(sources.data.length, "document")}, each with its source.`,
    };
  }
  return null;
};

/** The page's one label: what the headline under it is about. */
const StatusLabel = ({ tone }: { tone: Tone }) => (
  <p
    className={clsx(
      "inline-flex items-center gap-2 font-receipt text-[11px] tracking-[0.12em] uppercase",
      tone === "ok" && "text-primary-800",
      tone === "warning" && "text-[#93370D]",
      tone === "error" && "text-[#B42318]",
    )}
  >
    <span
      aria-hidden="true"
      className={clsx(
        "h-1.5 w-1.5 rounded-full",
        tone === "loading" && "bg-brand-ink/30",
        tone === "ok" && "bg-primary-700",
        tone === "warning" && "bg-[#B54708]",
        tone === "error" && "bg-[#B42318]",
      )}
    />
    Assistant status
  </p>
);

const OverviewHeader = ({
  sources,
  onRetry,
}: {
  sources: Sources;
  onRetry?: () => void;
}) => {
  const tone = toneOf(sources);
  const text = verdict(sources);

  return (
    <PageHeader
      overlap
      breadcrumb={<StatusLabel tone={tone} />}
      title={
        text ? (
          text.title
        ) : (
          <>
            <span className="sr-only">Overview</span>
            <Skeleton className="h-9 w-80 max-w-full sm:h-11" />
          </>
        )
      }
      description={
        text ? text.detail : <Skeleton className="h-5 w-96 max-w-full" />
      }
      actions={
        <>
          {tone === "ok" && (
            <Link href={CHAT_PATH} className={buttonSecondary}>
              <MessageSquare
                aria-hidden="true"
                className="h-4 w-4 text-primary-700"
              />
              Test in chat
            </Link>
          )}
          {tone === "error" && onRetry && (
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

const split = "@4xl:grid-cols-[minmax(0,1fr)_minmax(0,20rem)]";

/** The sheet and the side column. The sheet's negative margin lifts it into
    the header band; the side column keeps the grid's own top edge. */
const Body = ({
  sheet,
  side,
}: {
  sheet: React.ReactNode;
  side?: React.ReactNode;
}) => (
  <Container className="pb-12">
    <div className="@container">
      <div
        className={clsx(
          "grid items-start gap-x-12 gap-y-10 pt-8",
          side && split,
        )}
      >
        {sheet}
        {side}
      </div>
    </div>
  </Container>
);

export const Overview = () => (
  <SignedIn
    fallback={
      // The real blocks in their loading state, so nothing jumps afterwards.
      <>
        <OverviewHeader sources={{ status: "loading" }} />
        <Body
          sheet={<KnowledgeSheet sources={{ status: "loading" }} />}
          side={<SideNoteSkeleton />}
        />
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

  const loadOrganizations = useCallback(
    (signal: AbortSignal) => organizationsApi.list(signal),
    [],
  );
  const { resource: organizations, retry: retryOrganizations } =
    useResource(loadOrganizations);

  const chatTried = useSyncExternalStore(
    subscribeChatTried,
    hasTriedChat,
    () => false,
  );

  const { access } = useOrganizationAccess();

  const loading =
    organizations.status === "loading" || sources.status === "loading";
  const steps = setupSteps({
    hasOrganization:
      organizations.status === "ready" && organizations.data.length > 0,
    hasContent: sources.status === "ready" && sources.data.length > 0,
    chatTried,
  });
  const setupOpen = !loading && steps.some((step) => !step.done);
  // Plain members don't manage organizations: no list for them. With no
  // organization at all, the setup step above already says so.
  const showOrganizations =
    canSeeOrganizations(access) &&
    !(organizations.status === "ready" && organizations.data.length === 0);
  // The side column stays while its content is unknown, so the sheet keeps
  // its width when the notes arrive. It goes only once we know it is empty.
  const sideEmpty =
    !loading && access !== "unknown" && !setupOpen && !showOrganizations;

  return (
    <>
      <OverviewHeader sources={sources} onRetry={retrySources} />
      <Body
        sheet={<KnowledgeSheet sources={sources} />}
        side={
          sideEmpty ? undefined : (
            <aside
              aria-label="Setup and organizations"
              className="flex min-w-0 flex-col gap-10"
            >
              {loading && <SideNoteSkeleton />}
              {setupOpen && <SetupNote steps={steps} />}
              {!loading && showOrganizations && (
                <OrganizationsNote
                  organizations={organizations}
                  onRetry={retryOrganizations}
                />
              )}
            </aside>
          )
        }
      />
    </>
  );
};

// ─── The knowledge sheet ─────────────────────────────────────────────
// One panel, two parts: the count of what the assistant knows, itemised like
// a receipt, and (under a dashed tear line) the documents added last.

/** "Files ........ 4": a label, a dotted leader, a right-aligned value. */
const ReceiptLine = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-baseline gap-2">
    <dt className="shrink-0">{label}</dt>
    <span
      aria-hidden="true"
      className="min-w-4 flex-1 -translate-y-[3px] border-b border-dotted border-brand-ink/30"
    />
    <dd className="shrink-0 text-brand-ink tabular-nums">{value}</dd>
  </div>
);

const receiptList =
  "flex min-w-0 flex-col gap-1.5 font-receipt text-[13px] text-[#4B5468]";

const RECENT_LIMIT = 5;
const DOCUMENT_COLUMNS = ["w-full", "hidden @xl:table-cell", ""];

const KnowledgeSheet = ({ sources }: { sources: Sources }) => {
  const docs = sources.status === "ready" ? sources.data : null;
  const latest = docs ? Math.max(0, ...docs.map((s) => s.ingested_at ?? 0)) : 0;
  const count = (n: number) => (docs ? n.toLocaleString() : "—");
  const recent = docs
    ? [...docs]
        .sort((a, b) => (b.ingested_at ?? 0) - (a.ingested_at ?? 0))
        .slice(0, RECENT_LIMIT)
    : [];

  return (
    // -mt: the grid's top padding plus the part that sits on the band.
    <Panel className="relative z-10 -mt-[5.5rem] min-w-0 overflow-hidden shadow-[0_18px_36px_-28px_rgba(18,23,42,0.45)] sm:-mt-24">
      <div className="@container">
        <section
          aria-labelledby="knowledge-count"
          className="grid items-end gap-x-10 gap-y-5 px-4 py-6 sm:px-6 @xl:grid-cols-[auto_minmax(0,1fr)] @3xl:grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)]"
        >
          <h2
            id="knowledge-count"
            className="flex items-baseline gap-3 self-start @xl:row-span-2 @3xl:row-span-1"
          >
            <span className="font-receipt text-[64px] leading-[0.85] font-normal tracking-[-0.04em] tabular-nums sm:text-[76px]">
              {docs ? (
                docs.length.toLocaleString()
              ) : sources.status === "loading" ? (
                <Skeleton className="h-14 w-12 sm:h-16" />
              ) : (
                "—"
              )}
            </span>
            <span className={clsx("text-sm font-normal", mutedText)}>
              {docs?.length === 1 ? "document" : "documents"}
              <br />
              it answers from
            </span>
          </h2>

          <dl className={receiptList}>
            {SOURCE_TYPES.map(({ type, plural: label }) => (
              <ReceiptLine
                key={type}
                label={label}
                value={count(
                  docs?.filter((s) => (s.source_type ?? "file") === type)
                    .length ?? 0,
                )}
              />
            ))}
          </dl>

          <dl className={clsx(receiptList, "@xl:col-start-2 @3xl:col-start-3")}>
            <ReceiptLine
              label="Indexed chunks"
              value={count(docs?.reduce((sum, s) => sum + s.chunks, 0) ?? 0)}
            />
            <ReceiptLine
              label="Last added"
              value={docs ? relativeTime(latest || null) : "—"}
            />
          </dl>
        </section>

        <section
          aria-labelledby="recent-documents"
          className="border-t border-dashed border-brand-ink/25"
        >
          <div className="flex items-baseline justify-between gap-4 px-4 pt-5 pb-4 sm:px-6">
            <h2 id="recent-documents" className="text-base font-semibold">
              Recent documents
            </h2>
            {docs && docs.length > 0 && (
              <Link
                href={KNOWLEDGE_PATH}
                className={clsx(textLink, "-my-2 py-2 text-sm")}
              >
                {docs.length > RECENT_LIMIT
                  ? `View all ${docs.length}`
                  : "View all"}
              </Link>
            )}
          </div>
          <table className={tableLook}>
            <thead>
              <tr>
                <th scope="col" className={clsx(thLook, "w-full")}>
                  Document
                </th>
                <th
                  scope="col"
                  className={clsx(thLook, "hidden text-right @xl:table-cell")}
                >
                  Chunks
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
                <EmptyTableRow
                  colSpan={3}
                  title="Documents could not be loaded"
                >
                  {sources.message}
                </EmptyTableRow>
              )}

              {docs && recent.length === 0 && (
                <EmptyTableRow colSpan={3} title="No documents yet">
                  Upload a PDF, add a page from your site or paste text with{" "}
                  <span className="font-medium text-brand-ink">
                    Add content
                  </span>{" "}
                  at the top of this page.
                </EmptyTableRow>
              )}

              {recent.map((source, index) => {
                const type = sourceType(source.source_type);
                const host = hostOf(source.url);
                return (
                  <tr
                    key={source.source_id}
                    style={{ "--row": index } as React.CSSProperties}
                    className={clsx("console-row-in", rowLook)}
                  >
                    {/* max-w-0 lets the title truncate instead of widening the table. */}
                    <td className={clsx(tdLook, "w-full max-w-0")}>
                      <div className="flex items-baseline gap-3">
                        <span
                          title={type.label}
                          className="w-9 shrink-0 font-receipt text-[11px] tracking-[0.08em] text-primary-800 uppercase"
                        >
                          {type.code}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-medium">
                            {source.title || source.source_id}
                          </p>
                          {/* What the narrow table has no column for. */}
                          <p
                            className={clsx(
                              "mt-0.5 truncate text-xs",
                              mutedText,
                              !host && "@xl:hidden",
                            )}
                          >
                            {host && (
                              <span translate="no" className="font-receipt">
                                {host}
                              </span>
                            )}
                            <span className="@xl:hidden">
                              {host && " · "}
                              {plural(source.chunks, "chunk")}
                            </span>
                          </p>
                        </div>
                      </div>
                    </td>
                    <td
                      className={clsx(
                        tdLook,
                        "hidden text-right font-receipt text-[13px] tabular-nums @xl:table-cell",
                      )}
                    >
                      {source.chunks.toLocaleString()}
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
                );
              })}
            </tbody>
          </table>
        </section>
      </div>
    </Panel>
  );
};

// ─── Side notes ──────────────────────────────────────────────────────

type SetupStep = {
  done: boolean;
  title: string;
  detail: string;
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
    detail: "One per business. Invite your team to it.",
    href: ORGANIZATIONS_PATH,
    action: "Create",
  },
  {
    done: hasContent,
    title: "Add your content",
    detail: "Policies, FAQs and product pages.",
    href: KNOWLEDGE_PATH,
    action: "Add",
  },
  {
    done: chatTried,
    title: "Test the answers",
    detail: "Ask what your visitors would ask.",
    href: CHAT_PATH,
    action: "Open chat",
  },
];

/** A checklist to tick off, shown only until every step is done. */
const SetupNote = ({ steps }: { steps: SetupStep[] }) => {
  const completed = steps.filter((step) => step.done).length;
  const current = steps.findIndex((step) => !step.done);

  return (
    <SideNote
      title="Get set up"
      meta={
        <p className={clsx("font-receipt text-xs tabular-nums", mutedText)}>
          {completed} of {steps.length} done
        </p>
      }
    >
      <ol className="mt-2 divide-y divide-brand-ink/10">
        {steps.map((step, index) => (
          <li key={step.title} className="flex items-start gap-3 py-3">
            <span
              aria-hidden="true"
              className={clsx(
                "mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[3px]",
                step.done
                  ? "bg-primary-700 text-white"
                  : index === current
                    ? "border-2 border-primary-700"
                    : "border border-brand-ink/30",
              )}
            >
              {step.done && <Check className="h-3 w-3" strokeWidth={3} />}
            </span>
            <div className="min-w-0 flex-1">
              <p
                className={clsx(
                  "text-sm",
                  step.done
                    ? "text-[#6B7385] line-through decoration-brand-ink/30"
                    : "font-medium",
                )}
              >
                {step.title}
                <span className="sr-only">
                  {step.done ? " (done)" : " (to do)"}
                </span>
              </p>
              {!step.done && (
                <p className={clsx("mt-0.5 text-xs", mutedText)}>
                  {step.detail}
                </p>
              )}
            </div>
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
    </SideNote>
  );
};

const ORG_LIMIT = 4;

const OrganizationsNote = ({
  organizations,
  onRetry,
}: {
  organizations: Resource<Organization[]>;
  onRetry: () => void;
}) => (
  <SideNote
    title="Organizations"
    meta={
      <Link
        href={ORGANIZATIONS_PATH}
        className={clsx(textLink, "-my-2 py-2 text-sm")}
      >
        Manage
      </Link>
    }
  >
    {organizations.status === "loading" && (
      <div className="mt-4 flex flex-col gap-3">
        <Skeleton className="h-4 w-48 max-w-full" />
        <Skeleton className="h-4 w-36" />
      </div>
    )}
    {organizations.status === "error" && (
      <div className="mt-3 flex flex-col items-start gap-3">
        <p className="text-sm text-[#B42318]">{organizations.error.message}</p>
        <button type="button" onClick={onRetry} className={buttonSecondary}>
          Try again
        </button>
      </div>
    )}
    {organizations.status === "ready" && (
      <ul className="mt-2 divide-y divide-brand-ink/10">
        {organizations.data.slice(0, ORG_LIMIT).map((organization) => (
          <li
            key={organization.id}
            className="flex items-center justify-between gap-3 py-2.5"
          >
            {/* A plain member can't open the organization: no link. */}
            {canManage(organization.role) ? (
              <Link
                href={`${ORGANIZATIONS_PATH}/${encodeURIComponent(organization.id)}`}
                className="min-w-0 truncate text-sm font-medium underline decoration-brand-ink/20 underline-offset-4 transition-colors duration-150 hover:decoration-primary-700"
              >
                {organization.name}
              </Link>
            ) : (
              <span className="min-w-0 truncate text-sm">
                {organization.name}
              </span>
            )}
            <RoleBadge role={organization.role} />
          </li>
        ))}
        {organizations.data.length > ORG_LIMIT && (
          <li className={clsx("py-2.5 text-xs", mutedText)}>
            and {organizations.data.length - ORG_LIMIT} more
          </li>
        )}
      </ul>
    )}
  </SideNote>
);

/** Holds the side column while we don't know yet what belongs in it. */
const SideNoteSkeleton = () => (
  <div
    role="status"
    aria-label="Loading"
    className="flex flex-col gap-3 border-t-2 border-brand-ink/10 pt-4"
  >
    <Skeleton className="h-6 w-32" />
    <Skeleton className="mt-2 h-4 w-full" />
    <Skeleton className="h-4 w-4/5" />
    <Skeleton className="h-4 w-3/5" />
  </div>
);
