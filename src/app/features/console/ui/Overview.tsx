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
  useConsoleUser,
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
 * the eye scans (top-left first): can my assistant answer yet, how much does
 * it know, what should I do next.
 *
 * Three different shapes, on purpose, instead of a grid of matching cards:
 * the status ledger (a receipt that rises into the header band), the recent
 * documents (the one boxed table) and unboxed side notes for what supports
 * them. "Add content" exists once, in the header.
 *
 * The layout follows the width of the content column (container queries), not
 * the viewport: the sidebar takes 256px of it from `lg` up.
 * ──────────────────────────────────────────────────────────── */

const ORGANIZATIONS_PATH = "/console/organizations";
const KNOWLEDGE_PATH = "/console/knowledge";
const CHAT_PATH = "/console/chat";

const DESCRIPTION = "Here is how your website assistant is doing.";

type Sources =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: KnowledgeSource[] };

const SOURCE_TYPES: { type: SourceType; label: string; plural: string }[] = [
  { type: "file", label: "File", plural: "Files" },
  { type: "url", label: "Web page", plural: "Web pages" },
  { type: "text", label: "Text", plural: "Pasted text" },
];

const typeLabel = (type: SourceType | null) =>
  SOURCE_TYPES.find((entry) => entry.type === (type ?? "file"))?.label ??
  "File";

const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? "";

const plural = (n: number, one: string, many = `${one}s`) =>
  `${n.toLocaleString()} ${n === 1 ? one : many}`;

const addContent = (
  <Link href={KNOWLEDGE_PATH} className={buttonPrimary}>
    <Plus aria-hidden="true" className="h-4 w-4" />
    Add content
  </Link>
);

const split =
  "grid items-start gap-x-12 gap-y-10 @4xl:grid-cols-[minmax(0,1fr)_minmax(0,20rem)]";

export const Overview = () => (
  <SignedIn
    fallback={
      // The real blocks in their loading state, so nothing jumps afterwards.
      <>
        <PageHeader
          title="Overview"
          overlap
          description={DESCRIPTION}
          actions={addContent}
        />
        <Container className="pb-12">
          <div className="@container">
            <AssistantLedger sources={{ status: "loading" }} />
            <div className={clsx("mt-10", split)}>
              <RecentDocuments sources={{ status: "loading" }} />
              <SideNoteSkeleton />
            </div>
          </div>
        </Container>
      </>
    }
  >
    <OverviewContent />
  </SignedIn>
);

const OverviewContent = () => {
  const user = useConsoleUser();
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
            : "Couldn't reach the knowledge base.",
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

  const greeting = firstName(user.name);
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
  // The side column stays while its content is unknown, so the table keeps
  // its width when the notes arrive. It goes only once we know it is empty.
  const sideEmpty =
    !loading && access !== "unknown" && !setupOpen && !showOrganizations;

  return (
    <>
      <PageHeader
        title="Overview"
        overlap
        description={`${greeting ? `Welcome back, ${greeting}. ` : ""}${DESCRIPTION}`}
        actions={addContent}
      />

      <Container className="pb-12">
        <div className="@container">
          {/* Status first. The ledger rises into the header band. */}
          <AssistantLedger sources={sources} onRetry={retrySources} />

          <div className={clsx("mt-10", !sideEmpty && split)}>
            <RecentDocuments sources={sources} />

            {!sideEmpty && (
              <aside
                aria-label="Setup and organizations"
                className={clsx(
                  "flex min-w-0 flex-col gap-10",
                  // Stacked (narrow), unfinished setup comes before the table.
                  setupOpen && "@max-4xl:order-first",
                )}
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
            )}
          </div>
        </div>
      </Container>
    </>
  );
};

// ─── Status ledger ───────────────────────────────────────────────────
// One panel: the verdict on the left, the count behind it on the right,
// itemised like a receipt. Documents is the number that decides "ready", so
// it is the one that is big.

/** "Files ........ 4": a label, a dotted leader, a right-aligned number. */
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

const AssistantLedger = ({
  sources,
  onRetry,
}: {
  sources: Sources;
  onRetry?: () => void;
}) => {
  const docs = sources.status === "ready" ? sources.data : null;
  const latest = docs ? Math.max(0, ...docs.map((s) => s.ingested_at ?? 0)) : 0;
  const count = (n: number) => (docs ? n.toLocaleString() : "—");

  const tone =
    sources.status === "error"
      ? "error"
      : docs && docs.length === 0
        ? "warning"
        : "ok";

  return (
    <section
      aria-label="Assistant status"
      className="relative z-10 -mt-14 overflow-hidden rounded-xl border border-brand-ink/10 bg-white shadow-[0_18px_36px_-28px_rgba(18,23,42,0.45)] sm:-mt-16 @2xl:grid @2xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]"
    >
      {/* Verdict */}
      <div
        className={clsx(
          "flex flex-col gap-4 p-6 sm:p-7",
          tone === "warning" && "bg-[#FFFAEB]",
        )}
      >
        {sources.status === "loading" ? (
          <>
            <Skeleton className="h-6 w-36" />
            <Skeleton className="h-10 w-56 max-w-full" />
            <Skeleton className="h-4 w-full max-w-sm" />
            <Skeleton className="mt-1 h-10 w-32" />
          </>
        ) : (
          <>
            <p
              className={clsx(
                "inline-flex w-fit items-center gap-2 rounded-[3px] border px-2 py-1 font-receipt text-[11px] tracking-[0.12em] uppercase",
                tone === "ok" && "border-primary-700/30 text-primary-800",
                tone === "warning" && "border-[#B54708]/30 text-[#93370D]",
                tone === "error" && "border-[#B42318]/30 text-[#B42318]",
              )}
            >
              <span
                aria-hidden="true"
                className={clsx(
                  "h-1.5 w-1.5 rounded-full",
                  tone === "ok" && "bg-primary-700",
                  tone === "warning" && "bg-[#B54708]",
                  tone === "error" && "bg-[#B42318]",
                )}
              />
              Assistant status
            </p>
            <h2 className="font-display text-[34px] leading-[1.05] tracking-[-0.015em] sm:text-[40px]">
              {tone === "ok"
                ? "Ready to answer"
                : tone === "warning"
                  ? "Needs content"
                  : "Status unavailable"}
            </h2>
            <p className="max-w-md text-sm text-[#4B5468]">
              {tone === "ok" && docs
                ? `Visitors get answers from ${plural(docs.length, "document")}, each with its source.`
                : tone === "warning"
                  ? "It has nothing to answer from yet. Add your policies, FAQs or product pages and it can start."
                  : sources.status === "error"
                    ? `We couldn’t check your knowledge base: ${sources.message}`
                    : null}
            </p>
            {/* "Add content" lives in the header: it is not repeated here. */}
            {tone === "ok" && (
              <Link
                href={CHAT_PATH}
                className={clsx(buttonSecondary, "mt-1 w-fit")}
              >
                <MessageSquare
                  aria-hidden="true"
                  className="h-4 w-4 text-primary-700"
                />
                Test in chat
              </Link>
            )}
            {tone === "error" && onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className={clsx(buttonSecondary, "mt-1 w-fit")}
              >
                Try again
              </button>
            )}
          </>
        )}
      </div>

      {/* The count behind it */}
      <div className="flex flex-col border-t border-brand-ink/10 p-6 sm:p-7 @2xl:border-t-0 @2xl:border-l">
        <div className="flex items-baseline justify-between gap-4 text-sm text-[#4B5468]">
          <h3>
            <Link
              href={KNOWLEDGE_PATH}
              className="font-medium underline decoration-brand-ink/20 underline-offset-4 hover:decoration-primary-700"
            >
              Documents
            </Link>
          </h3>
          <p className="text-xs">
            {docs
              ? docs.length
                ? `last added ${relativeTime(latest || null)}`
                : "nothing added yet"
              : null}
          </p>
        </div>

        <div className="mt-auto flex flex-wrap items-end gap-x-10 gap-y-5 pt-4">
          <p className="font-receipt text-[64px] leading-none tracking-[-0.04em] tabular-nums sm:text-[76px]">
            {docs ? (
              docs.length.toLocaleString()
            ) : sources.status === "loading" ? (
              <Skeleton className="h-16 w-14 sm:h-[76px]" />
            ) : (
              "—"
            )}
          </p>
          <dl className="flex min-w-[12rem] flex-1 flex-col gap-1.5 pb-1 font-receipt text-[13px] text-[#4B5468]">
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
            <div className="mt-1.5 border-t border-dashed border-brand-ink/25 pt-2.5">
              <ReceiptLine
                label="Indexed chunks"
                value={count(docs?.reduce((sum, s) => sum + s.chunks, 0) ?? 0)}
              />
            </div>
          </dl>
        </div>
      </div>
    </section>
  );
};

// ─── Recent documents ────────────────────────────────────────────────

const RECENT_LIMIT = 5;
const DOCUMENT_COLUMNS = [
  "w-full",
  "hidden sm:table-cell",
  "hidden sm:table-cell",
  "",
];

const RecentDocuments = ({ sources }: { sources: Sources }) => {
  const recent =
    sources.status === "ready"
      ? [...sources.data]
          .sort((a, b) => (b.ingested_at ?? 0) - (a.ingested_at ?? 0))
          .slice(0, RECENT_LIMIT)
      : [];
  const total = sources.status === "ready" ? sources.data.length : 0;

  return (
    <Panel className="min-w-0 overflow-hidden">
      <section aria-labelledby="recent-documents">
        <div className="flex items-baseline justify-between gap-4 px-4 py-4 sm:px-6">
          <h2 id="recent-documents" className="text-base font-semibold">
            Recent documents
          </h2>
          {total > 0 && (
            <Link href={KNOWLEDGE_PATH} className={clsx(textLink, "text-sm")}>
              {total > RECENT_LIMIT ? `View all ${total}` : "View all"}
            </Link>
          )}
        </div>
        <table className={tableLook}>
          <thead>
            <tr>
              <th scope="col" className={clsx(thLook, "w-full")}>
                Document
              </th>
              <th scope="col" className={clsx(thLook, "hidden sm:table-cell")}>
                Type
              </th>
              <th
                scope="col"
                className={clsx(thLook, "hidden text-right sm:table-cell")}
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

            {/* The ledger above offers "Try again": not repeated here. */}
            {sources.status === "error" && (
              <EmptyTableRow colSpan={4} title="Documents could not be loaded">
                {sources.message}
              </EmptyTableRow>
            )}

            {sources.status === "ready" && recent.length === 0 && (
              <EmptyTableRow colSpan={4} title="No documents yet">
                Upload a PDF, add a page from your site or paste text with{" "}
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
                  <p className={clsx("mt-0.5 text-xs sm:hidden", mutedText)}>
                    {typeLabel(source.source_type)} ·{" "}
                    {plural(source.chunks, "chunk")}
                  </p>
                </td>
                <td
                  className={clsx(
                    tdLook,
                    "hidden whitespace-nowrap sm:table-cell",
                    mutedText,
                  )}
                >
                  {typeLabel(source.source_type)}
                </td>
                <td
                  className={clsx(
                    tdLook,
                    "hidden text-right font-receipt text-[13px] tabular-nums sm:table-cell",
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
            ))}
          </tbody>
        </table>
      </section>
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
                className={clsx(textLink, "shrink-0 text-sm")}
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
      <Link href={ORGANIZATIONS_PATH} className={clsx(textLink, "text-sm")}>
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
