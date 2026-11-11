"use client";

import {
  useCallback,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import Link from "next/link";
import { clsx } from "clsx";
import {
  BookOpen,
  Check,
  FileText,
  Globe,
  MessageSquare,
  Plus,
  Type,
} from "lucide-react";
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
  Avatar,
  Panel,
  RoleBadge,
  Skeleton,
  buttonPrimary,
  buttonSecondary,
  mutedText,
} from "@/app/features/console/ui/consoleUi";

/* ────────────────────────────────────────────────────────────
 * /console — the console's home.
 *
 * It answers the questions a store owner opens the console with, in the order
 * the eye scans (top-left first): can my assistant answer yet, how much does
 * it know, what should I do next. Each block is a summary that links to the
 * page holding the details.
 * ──────────────────────────────────────────────────────────── */

const ORGANIZATIONS_PATH = "/console/organizations";
const KNOWLEDGE_PATH = "/console/knowledge";
const CHAT_PATH = "/console/chat";

type Sources =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: KnowledgeSource[] };

const TYPE_META: Record<
  SourceType,
  { label: string; plural: string; icon: typeof FileText }
> = {
  file: { label: "File", plural: "files", icon: FileText },
  url: { label: "Web page", plural: "web pages", icon: Globe },
  text: { label: "Text", plural: "texts", icon: Type },
};

const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? "";

const plural = (n: number, one: string, many = `${one}s`) =>
  `${n.toLocaleString()} ${n === 1 ? one : many}`;

export const Overview = () => (
  <SignedIn
    fallback={
      <>
        <PageHeader title="Overview" />
        <Container className="py-8 sm:py-10">
          <OverviewSkeleton />
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

  return (
    <>
      <PageHeader
        title="Overview"
        overlap
        description={`${greeting ? `Welcome back, ${greeting}. ` : ""}Here is how your website assistant is doing.`}
        actions={
          <Link href={KNOWLEDGE_PATH} className={buttonPrimary}>
            <Plus aria-hidden="true" className="h-4 w-4" />
            Add content
          </Link>
        }
      />

      <Container className="flex flex-col gap-6 py-8 sm:py-10">
        {/* Status first. The panel rises into the header band. */}
        <section aria-label="Assistant status">
          <AssistantLedger
            showOrganizationsLink={canSeeOrganizations(access)}
            sources={sources}
            organizations={organizations}
            onRetry={retrySources}
          />
        </section>

        {/* Row 2 — what to do next, and the latest details */}
        <div className="grid items-start gap-6 lg:grid-cols-12">
          <div className="flex flex-col gap-6 lg:col-span-7">
            <RecentDocuments sources={sources} onRetry={retrySources} />
          </div>
          <div className="flex flex-col gap-6 lg:col-span-5">
            <SetupChecklist
              hasOrganization={
                organizations.status === "ready" &&
                organizations.data.length > 0
              }
              hasContent={sources.status === "ready" && sources.data.length > 0}
              chatTried={chatTried}
              loading={
                organizations.status === "loading" ||
                sources.status === "loading"
              }
            />
            {/* Plain members don't manage organizations: no card for them. */}
            {canSeeOrganizations(access) && (
              <OrganizationsCard
                organizations={organizations}
                onRetry={retryOrganizations}
              />
            )}
          </div>
        </div>
      </Container>
    </>
  );
};

// ─── Status ledger ───────────────────────────────────────────────────
// One panel, not three equal cards: the verdict on the left, the numbers
// behind it on the right, read like a receipt. Documents is the number that
// decides "ready", so it is the one that is big.

const AssistantLedger = ({
  showOrganizationsLink,
  sources,
  organizations,
  onRetry,
}: {
  showOrganizationsLink: boolean;
  sources: Sources;
  organizations: Resource<Organization[]>;
  onRetry: () => void;
}) => {
  const docs = sources.status === "ready" ? sources.data : null;
  const latest = docs ? Math.max(0, ...docs.map((s) => s.ingested_at ?? 0)) : 0;
  const chunks = docs ? docs.reduce((sum, s) => sum + s.chunks, 0) : 0;
  const byType = docs
    ? (Object.keys(TYPE_META) as SourceType[])
        .map((type) => ({
          type,
          n: docs.filter((s) => (s.source_type ?? "file") === type).length,
        }))
        .filter(({ n }) => n > 0)
        .map(({ type, n }) =>
          plural(
            n,
            TYPE_META[type].label.toLowerCase(),
            TYPE_META[type].plural,
          ),
        )
        .join(" · ")
    : "";
  const orgs = organizations.status === "ready" ? organizations.data : null;
  const managed = orgs ? orgs.filter((o) => canManage(o.role)).length : 0;

  const tone =
    sources.status === "error"
      ? "error"
      : docs && docs.length === 0
        ? "warning"
        : "ok";

  return (
    <div className="relative z-10 -mt-14 overflow-hidden rounded-xl border border-brand-ink/10 bg-white shadow-[0_18px_36px_-28px_rgba(18,23,42,0.45)] sm:-mt-16 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
      {/* Verdict */}
      <div
        className={clsx(
          "flex flex-col gap-4 p-6 sm:p-7",
          tone === "warning" && "bg-[#FFFAEB]",
        )}
      >
        {sources.status === "loading" ? (
          <>
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-9 w-56 max-w-full" />
            <Skeleton className="h-4 w-full max-w-sm" />
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
                  ? "It has nothing to answer from yet. Add your policies, FAQs or product pages."
                  : sources.status === "error"
                    ? `We couldn’t check your knowledge base: ${sources.message}`
                    : null}
            </p>
            <div className="mt-1">
              {tone === "ok" && (
                <Link href={CHAT_PATH} className={buttonSecondary}>
                  <MessageSquare
                    aria-hidden="true"
                    className="h-4 w-4 text-primary-700"
                  />
                  Test in chat
                </Link>
              )}
              {tone === "warning" && (
                <Link href={KNOWLEDGE_PATH} className={buttonPrimary}>
                  <Plus aria-hidden="true" className="h-4 w-4" />
                  Add content
                </Link>
              )}
              {tone === "error" && (
                <button
                  type="button"
                  onClick={onRetry}
                  className={buttonSecondary}
                >
                  Try again
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {/* The numbers behind it */}
      <dl className="flex flex-col border-t border-brand-ink/10 lg:border-t-0 lg:border-l">
        <div className="px-6 pt-6 pb-5 sm:px-7">
          <dt className="flex items-baseline justify-between gap-4 text-sm text-[#4B5468]">
            <Link
              href={KNOWLEDGE_PATH}
              className="font-medium underline decoration-brand-ink/20 underline-offset-4 hover:decoration-primary-700"
            >
              Documents
            </Link>
            <span className="text-xs">
              {docs
                ? docs.length
                  ? `last added ${relativeTime(latest || null)}`
                  : "nothing added yet"
                : null}
            </span>
          </dt>
          <dd className="mt-2 font-receipt text-[64px] leading-none tracking-[-0.04em] text-brand-ink tabular-nums sm:text-[76px]">
            {docs ? (
              docs.length.toLocaleString()
            ) : sources.status === "loading" ? (
              <Skeleton className="h-16 w-24" />
            ) : (
              "—"
            )}
          </dd>
        </div>
        <div className="mt-auto grid grid-cols-2 border-t border-dashed border-brand-ink/20">
          <div className="px-6 py-4 sm:px-7">
            <dt className="text-xs text-[#4B5468]">Indexed chunks</dt>
            <dd className="mt-1 font-receipt text-2xl tabular-nums">
              {docs ? chunks.toLocaleString() : "—"}
            </dd>
            <dd className="mt-0.5 truncate text-xs text-[#6B7385]">{byType}</dd>
          </div>
          <div className="border-l border-dashed border-brand-ink/20 px-6 py-4 sm:px-7">
            <dt className="text-xs text-[#4B5468]">
              {showOrganizationsLink ? (
                <Link
                  href={ORGANIZATIONS_PATH}
                  className="underline decoration-brand-ink/20 underline-offset-4 hover:decoration-primary-700"
                >
                  Organizations
                </Link>
              ) : (
                "Organizations"
              )}
            </dt>
            <dd className="mt-1 font-receipt text-2xl tabular-nums">
              {orgs ? orgs.length.toLocaleString() : "—"}
            </dd>
            <dd className="mt-0.5 truncate text-xs text-[#6B7385]">
              {orgs
                ? orgs.length
                  ? `you manage ${managed}`
                  : "none yet"
                : null}
            </dd>
          </div>
        </div>
      </dl>
    </div>
  );
};

// ─── Recent documents ────────────────────────────────────────────────

const RECENT_LIMIT = 5;

const CardHeader = ({
  title,
  href,
  linkLabel,
}: {
  title: string;
  href?: string;
  linkLabel?: string;
}) => (
  <div className="flex items-center justify-between gap-4 border-b border-brand-ink/10 px-5 py-4 sm:px-6">
    <h2 className="text-base font-semibold">{title}</h2>
    {href && (
      <Link
        href={href}
        className="text-sm font-medium text-primary-700 underline decoration-primary-700/30 underline-offset-4 hover:decoration-primary-700"
      >
        {linkLabel}
      </Link>
    )}
  </div>
);

const RecentDocuments = ({
  sources,
  onRetry,
}: {
  sources: Sources;
  onRetry: () => void;
}) => {
  const recent =
    sources.status === "ready"
      ? [...sources.data]
          .sort((a, b) => (b.ingested_at ?? 0) - (a.ingested_at ?? 0))
          .slice(0, RECENT_LIMIT)
      : [];

  return (
    <Panel className="overflow-hidden">
      <section aria-label="Recent documents">
        <CardHeader
          title="Recent documents"
          href={
            sources.status === "ready" && sources.data.length
              ? KNOWLEDGE_PATH
              : undefined
          }
          linkLabel="View all"
        />

        {sources.status === "loading" && (
          <ul
            aria-label="Loading documents"
            className="divide-y divide-brand-ink/10"
          >
            {[0, 1, 2].map((row) => (
              <li
                key={row}
                className="flex items-center gap-3 px-5 py-3.5 sm:px-6"
              >
                <Skeleton className="h-9 w-9 rounded-lg" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-48 max-w-full" />
                  <Skeleton className="mt-2 h-3 w-32" />
                </div>
              </li>
            ))}
          </ul>
        )}

        {sources.status === "error" && (
          <div className="flex flex-col items-start gap-3 px-5 py-6 sm:px-6">
            <p className="text-sm text-[#B42318]">{sources.message}</p>
            <button type="button" onClick={onRetry} className={buttonSecondary}>
              Try again
            </button>
          </div>
        )}

        {sources.status === "ready" && recent.length === 0 && (
          <div className="px-5 py-10 text-center sm:px-6">
            <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-brand-wash text-primary-700">
              <BookOpen aria-hidden="true" className="h-5 w-5" />
            </span>
            <p className="mt-3 text-sm font-medium">No documents yet</p>
            <p className={clsx("mx-auto mt-1 max-w-sm text-sm", mutedText)}>
              Upload a PDF, add a page from your site, or paste text. They will
              show up here.
            </p>
            <Link href={KNOWLEDGE_PATH} className={clsx(buttonPrimary, "mt-5")}>
              <Plus aria-hidden="true" className="h-4 w-4" />
              Add content
            </Link>
          </div>
        )}

        {recent.length > 0 && (
          <ul className="divide-y divide-brand-ink/10">
            {recent.map((source) => {
              const meta = TYPE_META[source.source_type ?? "file"];
              const Icon = meta.icon;
              return (
                <li
                  key={source.source_id}
                  className="flex items-center gap-3 px-5 py-3.5 sm:px-6"
                >
                  <span
                    aria-hidden="true"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-wash text-primary-700"
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {source.title || source.source_id}
                    </p>
                    <p className={clsx("mt-0.5 text-xs", mutedText)}>
                      {meta.label} · {plural(source.chunks, "chunk")}
                    </p>
                  </div>
                  <span className={clsx("shrink-0 text-xs", mutedText)}>
                    {relativeTime(source.ingested_at)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </Panel>
  );
};

// ─── Setup checklist ─────────────────────────────────────────────────

const SetupChecklist = ({
  hasOrganization,
  hasContent,
  chatTried,
  loading,
}: {
  hasOrganization: boolean;
  hasContent: boolean;
  chatTried: boolean;
  loading: boolean;
}) => {
  const steps = [
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
  const completed = steps.filter((s) => s.done).length;

  // Done, or not known yet: keep the space for the details below.
  if (loading || completed === steps.length) return null;

  const current = steps.findIndex((s) => !s.done);

  return (
    <Panel className="overflow-hidden">
      <section aria-labelledby="setup-heading">
        <div className="border-b border-brand-ink/10 px-5 py-4 sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <h2 id="setup-heading" className="text-base font-semibold">
              Get set up
            </h2>
            <p className={clsx("text-sm tabular-nums", mutedText)}>
              {completed} of {steps.length}
            </p>
          </div>
          <div
            role="progressbar"
            aria-label="Setup progress"
            aria-valuemin={0}
            aria-valuemax={steps.length}
            aria-valuenow={completed}
            className="mt-3 h-1.5 overflow-hidden rounded-full bg-brand-ink/[0.07]"
          >
            <div
              className="h-full rounded-full bg-primary-700 transition-[width] duration-500"
              style={{ width: `${(completed / steps.length) * 100}%` }}
            />
          </div>
        </div>
        <ol className="divide-y divide-brand-ink/10">
          {steps.map((step, index) => (
            <li
              key={step.title}
              className="flex items-center gap-3 px-5 py-3.5 sm:px-6"
            >
              <span
                aria-hidden="true"
                className={clsx(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                  step.done
                    ? "bg-primary-700 text-white"
                    : index === current
                      ? "border-2 border-primary-700 text-primary-700"
                      : "border border-brand-ink/20 text-[#6B7385]",
                )}
              >
                {step.done ? <Check className="h-3.5 w-3.5" /> : index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p
                  className={clsx(
                    "text-sm font-medium",
                    step.done &&
                      "text-[#6B7385] line-through decoration-brand-ink/30",
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
                  className={clsx(
                    "shrink-0",
                    index === current
                      ? clsx(buttonPrimary, "h-9 px-3")
                      : "text-sm font-medium text-primary-700 hover:underline",
                  )}
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

// ─── Organizations ───────────────────────────────────────────────────

const ORG_LIMIT = 4;

const OrganizationsCard = ({
  organizations,
  onRetry,
}: {
  organizations: Resource<Organization[]>;
  onRetry: () => void;
}) => (
  <Panel className="overflow-hidden">
    <section aria-label="Your organizations">
      <CardHeader
        title="Your organizations"
        href={ORGANIZATIONS_PATH}
        linkLabel="Manage"
      />
      {organizations.status === "loading" && (
        <div className="flex flex-col gap-3 px-5 py-4 sm:px-6">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      )}
      {organizations.status === "error" && (
        <div className="flex flex-col items-start gap-3 px-5 py-6 sm:px-6">
          <p className="text-sm text-[#B42318]">
            {organizations.error.message}
          </p>
          <button type="button" onClick={onRetry} className={buttonSecondary}>
            Try again
          </button>
        </div>
      )}
      {organizations.status === "ready" &&
        (organizations.data.length === 0 ? (
          <p className={clsx("px-5 py-6 text-sm sm:px-6", mutedText)}>
            You are not in any organization yet.
          </p>
        ) : (
          <ul className="divide-y divide-brand-ink/10">
            {organizations.data.slice(0, ORG_LIMIT).map((organization) => (
              <li key={organization.id}>
                <Link
                  href={`${ORGANIZATIONS_PATH}/${encodeURIComponent(organization.id)}`}
                  className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-brand-wash/60 sm:px-6"
                >
                  <Avatar
                    name={organization.name}
                    src={organization.logoUrl}
                    shape="square"
                    className="h-9 w-9 text-xs"
                  />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {organization.name}
                  </span>
                  <RoleBadge role={organization.role} />
                </Link>
              </li>
            ))}
            {organizations.data.length > ORG_LIMIT && (
              <li className={clsx("px-5 py-3 text-xs sm:px-6", mutedText)}>
                and {organizations.data.length - ORG_LIMIT} more
              </li>
            )}
          </ul>
        ))}
    </section>
  </Panel>
);

// ─── Loading shell ───────────────────────────────────────────────────

/** Mirrors the final layout so nothing jumps when the data arrives. */
const OverviewSkeleton = () => (
  <div
    role="status"
    aria-label="Loading overview"
    className="flex flex-col gap-6"
  >
    <div className="grid gap-4 lg:grid-cols-12">
      <Skeleton className="h-44 rounded-xl lg:col-span-5" />
      <div className="grid gap-4 sm:grid-cols-3 lg:col-span-7">
        {[0, 1, 2].map((n) => (
          <Skeleton key={n} className="h-36 rounded-xl" />
        ))}
      </div>
    </div>
    <div className="grid gap-6 lg:grid-cols-12">
      <Skeleton className="h-72 rounded-xl lg:col-span-7" />
      <Skeleton className="h-72 rounded-xl lg:col-span-5" />
    </div>
  </div>
);
