"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import {
  FileText,
  Globe,
  MessageSquare,
  RefreshCw,
  Trash2,
  Type,
} from "lucide-react";
import { Container } from "@/app/features/landing/ui/primitives";
import { PageHeader, SignedIn } from "@/app/features/console/ui/ConsoleShell";
import {
  ErrorState,
  SearchInput,
  Panel,
  Skeleton,
  Spinner,
  buttonSecondary,
  mutedText,
} from "@/app/features/console/ui/consoleUi";
import { AiApiError, deleteSource, listSources } from "../api/aiApi";
import type { KnowledgeSource, SourceType } from "../types/ai.types";
import { relativeTime } from "../utils/relativeTime";
import { AddContentPanel } from "./AddContentPanel";
import type { Organization } from "@/app/features/organizations/types/organization.types";
import { useDocumentOrganizations } from "@/app/features/documents/hooks/useDocumentOrganizations";
import { useOrganizationDocuments } from "@/app/features/documents/hooks/useOrganizationDocuments";
import { DocumentsPanel } from "@/app/features/documents/ui/DocumentsPanel";
import {
  DocumentUploadTab,
  DocumentUploadUnavailable,
} from "@/app/features/documents/ui/DocumentUploadTab";
import { OrganizationPicker } from "@/app/features/documents/ui/OrganizationPicker";

const TYPE_META: Record<SourceType, { label: string; icon: typeof FileText }> =
  {
    file: { label: "File", icon: FileText },
    url: { label: "Web page", icon: Globe },
    text: { label: "Text", icon: Type },
  };

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready" };

const header = (
  <PageHeader
    title="Knowledge base"
    description="The documents and pages your website assistant answers from. It only uses what’s here, and says so when something isn’t covered."
    actions={
      <Link href="/console/chat" className={buttonSecondary}>
        <MessageSquare
          aria-hidden="true"
          className="h-4 w-4 text-primary-700"
        />
        Test in chat
      </Link>
    }
  />
);

/** /console/knowledge — what the assistant answers from. */
export const KnowledgeBase = () => (
  <SignedIn
    fallback={
      <>
        {header}
        <Container className="py-8 sm:py-10">
          <Skeleton className="h-56 w-full rounded-card" />
        </Container>
      </>
    }
  >
    <Knowledge />
  </SignedIn>
);

const Knowledge = () => {
  const [sources, setSources] = useState<KnowledgeSource[]>([]);
  const [load, setLoad] = useState<LoadState>({ status: "loading" });

  const refresh = useCallback(async () => {
    try {
      setSources(await listSources());
      setLoad({ status: "ready" });
    } catch (error) {
      setLoad({
        status: "error",
        message:
          error instanceof AiApiError
            ? error.message
            : "Couldn't load the knowledge base.",
      });
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const retry = () => {
    setLoad({ status: "loading" });
    void refresh();
  };

  const totalChunks = sources.reduce((sum, s) => sum + s.chunks, 0);
  const latest = Math.max(0, ...sources.map((s) => s.ingested_at ?? 0));

  // Filters: free-text search plus one type at a time. Newest first.
  const [query, setQuery] = useState("");
  const [type, setType] = useState<SourceType | "all">("all");
  const needle = query.trim().toLowerCase();
  const countOf = (t: SourceType) =>
    sources.filter((s) => (s.source_type ?? "file") === t).length;
  const visible = sources
    .filter((s) => type === "all" || (s.source_type ?? "file") === type)
    .filter(
      (s) =>
        !needle ||
        (s.title ?? "").toLowerCase().includes(needle) ||
        s.source_id.toLowerCase().includes(needle) ||
        (s.url ?? "").toLowerCase().includes(needle),
    )
    .sort((a, b) => (b.ingested_at ?? 0) - (a.ingested_at ?? 0));
  const filtered = Boolean(needle) || type !== "all";
  const clearFilters = () => {
    setQuery("");
    setType("all");
  };

  // Uploaded files belong to an organization in the backend.
  const organizations = useDocumentOrganizations();
  const [uploading, setUploading] = useState(false);
  const selected = organizations.selected;

  return (
    <>
      {header}
      <Container className="flex flex-col gap-6 py-8 sm:py-10">
        <dl className="grid grid-cols-2 gap-3 sm:max-w-2xl sm:grid-cols-3">
          <Stat
            label="Documents"
            value={load.status === "ready" ? sources.length : "—"}
          />
          <Stat
            label="Indexed chunks"
            value={load.status === "ready" ? totalChunks.toLocaleString() : "—"}
          />
          <Stat
            label="Last updated"
            value={
              load.status === "ready" && latest ? relativeTime(latest) : "—"
            }
          />
        </dl>

        {selected ? (
          <OrganizationFiles
            // A fresh mount per organization: never another one's files.
            key={selected.id}
            organization={selected}
            onAiAdded={refresh}
            onBusyChange={setUploading}
            picker={
              organizations.organizations.length > 1 && (
                <OrganizationPicker
                  organizations={organizations.organizations}
                  selectedId={selected.id}
                  onSelect={organizations.select}
                  disabled={uploading}
                />
              )
            }
          />
        ) : (
          <AddContentPanel
            onAdded={refresh}
            uploadTab={
              <DocumentUploadUnavailable
                status={
                  organizations.resource.status === "ready"
                    ? "none"
                    : organizations.resource.status
                }
                message={
                  organizations.resource.status === "error"
                    ? organizations.resource.error.message
                    : undefined
                }
                onRetry={organizations.retry}
              />
            }
          />
        )}

        {load.status === "error" ? (
          <ErrorState
            title="The knowledge base could not be loaded"
            message={load.message}
            onRetry={retry}
          />
        ) : (
          <Panel className="overflow-hidden">
            <section aria-labelledby="sources-heading">
              <div className="flex items-center justify-between gap-4 border-b border-brand-ink/10 px-4 py-4 sm:px-6">
                <div className="flex items-baseline gap-3">
                  <h2 id="sources-heading" className="text-base font-semibold">
                    Documents
                  </h2>
                  {load.status === "ready" && filtered && (
                    <p className={clsx("text-sm tabular-nums", mutedText)}>
                      {visible.length} of {sources.length}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={retry}
                  className="inline-flex h-8 items-center gap-1.5 rounded-control px-2.5 text-xs font-medium text-brand-ink-muted transition-colors hover:bg-brand-wash hover:text-brand-ink"
                >
                  <RefreshCw aria-hidden="true" className="h-3.5 w-3.5" />
                  Refresh
                </button>
              </div>

              {load.status === "loading" && (
                <ul
                  role="status"
                  aria-label="Loading documents"
                  className="divide-y divide-brand-ink/10"
                >
                  {[0, 1, 2].map((row) => (
                    <li
                      key={row}
                      className="flex items-center gap-4 px-4 py-3.5 sm:px-6"
                    >
                      <Skeleton className="h-9 w-9 rounded-box" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-56 max-w-full" />
                        <Skeleton className="mt-2 h-3 w-40" />
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {load.status === "ready" && sources.length === 0 && (
                <p
                  className={clsx("px-6 py-10 text-center text-sm", mutedText)}
                >
                  No documents yet. Upload your policies, FAQs or product pages
                  above to get started.
                </p>
              )}

              {load.status === "ready" && sources.length > 0 && (
                <div className="flex flex-col gap-3 border-b border-brand-ink/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                  <div
                    role="group"
                    aria-label="Filter by type"
                    className="flex flex-wrap gap-1.5"
                  >
                    {(
                      [
                        ["all", "All", sources.length],
                        ["file", "Files", countOf("file")],
                        ["url", "Web pages", countOf("url")],
                        ["text", "Text", countOf("text")],
                      ] as const
                    ).map(([value, label, n]) => (
                      <button
                        key={value}
                        type="button"
                        aria-pressed={type === value}
                        disabled={value !== "all" && n === 0}
                        onClick={() => setType(value)}
                        className={clsx(
                          "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors disabled:opacity-40",
                          type === value
                            ? "border-primary-700 bg-primary-700 text-white"
                            : "border-brand-ink/15 text-brand-ink-muted hover:border-brand-ink/30 hover:text-brand-ink",
                        )}
                      >
                        {label}
                        <span
                          className={clsx(
                            "tabular-nums",
                            type === value
                              ? "text-white/80"
                              : "text-brand-ink-subtle",
                          )}
                        >
                          {n}
                        </span>
                      </button>
                    ))}
                  </div>
                  <SearchInput
                    label="Search documents"
                    placeholder="Search by title or address"
                    value={query}
                    onChange={setQuery}
                  />
                </div>
              )}

              {load.status === "ready" &&
                sources.length > 0 &&
                visible.length === 0 && (
                  <div className="px-6 py-10 text-center">
                    <p className={clsx("text-sm", mutedText)}>
                      No documents match these filters.
                    </p>
                    <button
                      type="button"
                      onClick={clearFilters}
                      className={clsx(buttonSecondary, "mt-4")}
                    >
                      Clear filters
                    </button>
                  </div>
                )}

              {load.status === "ready" && visible.length > 0 && (
                <ul className="divide-y divide-brand-ink/10">
                  {visible.map((source) => (
                    <SourceRow
                      key={source.source_id}
                      source={source}
                      onDeleted={() =>
                        setSources((prev) =>
                          prev.filter((s) => s.source_id !== source.source_id),
                        )
                      }
                    />
                  ))}
                </ul>
              )}
            </section>
          </Panel>
        )}
      </Container>
    </>
  );
};

/**
 * Add content, with Upload files sending to `organization`, and the list of
 * that organization's uploaded files. They share one documents state, so an
 * upload shows in the list as soon as it settles.
 */
const OrganizationFiles = ({
  organization,
  onAiAdded,
  onBusyChange,
  picker,
}: {
  organization: Organization;
  onAiAdded: () => void;
  onBusyChange: (busy: boolean) => void;
  picker: React.ReactNode;
}) => {
  const documents = useOrganizationDocuments(organization);
  return (
    <>
      <AddContentPanel
        onAdded={onAiAdded}
        uploadTab={
          <DocumentUploadTab
            organization={organization}
            onSettled={documents.refresh}
            onBusyChange={onBusyChange}
          />
        }
      />
      <DocumentsPanel
        organization={organization}
        documents={documents}
        picker={picker}
      />
    </>
  );
};

const Stat = ({ label, value }: { label: string; value: string | number }) => (
  <div className="rounded-card border border-brand-ink/10 bg-white px-4 py-3">
    <dt className={clsx("text-xs font-medium", mutedText)}>{label}</dt>
    <dd className="mt-1 text-2xl font-semibold tabular-nums">{value}</dd>
  </div>
);

const SourceRow = ({
  source,
  onDeleted,
}: {
  source: KnowledgeSource;
  onDeleted: () => void;
}) => {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const meta = TYPE_META[source.source_type ?? "file"];
  const Icon = meta.icon;
  const title = source.title || source.source_id;

  const remove = async () => {
    setDeleting(true);
    setError(null);
    try {
      await deleteSource(source.source_id);
      onDeleted();
    } catch (err) {
      setError(
        err instanceof AiApiError
          ? err.message
          : "Couldn't delete this document.",
      );
      setDeleting(false);
      setConfirming(false);
    }
  };

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3.5 sm:px-6">
      <span
        aria-hidden="true"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-box bg-brand-wash text-primary-700"
      >
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium" title={title}>
          {source.url ? (
            <a
              href={source.url}
              target="_blank"
              rel="noreferrer"
              className="hover:underline"
            >
              {title}
            </a>
          ) : (
            title
          )}
        </p>
        <p className={clsx("mt-0.5 text-xs", mutedText)}>
          {meta.label} · {source.chunks.toLocaleString()} chunk
          {source.chunks === 1 ? "" : "s"} · added{" "}
          {relativeTime(source.ingested_at)}
        </p>
        {error && (
          <p role="alert" className="mt-1 text-xs text-[#B42318]">
            {error}
          </p>
        )}
      </div>

      {confirming ? (
        <div className="flex items-center gap-2">
          <span className={clsx("text-xs", mutedText)}>Delete?</span>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            disabled={deleting}
            className="rounded-control px-2.5 py-1.5 text-xs font-medium text-brand-ink-muted hover:bg-brand-mist hover:text-brand-ink"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={remove}
            disabled={deleting}
            className={clsx(
              "inline-flex items-center gap-1.5 rounded-control border border-status-error/30 bg-white px-2.5 py-1.5 text-xs font-semibold text-[#B42318] hover:bg-[#FEF3F2]",
              deleting && "cursor-wait opacity-70",
            )}
          >
            {deleting && <Spinner className="h-3.5 w-3.5" />}
            Delete
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          aria-label={`Delete ${title}`}
          className="inline-flex h-9 w-9 items-center justify-center rounded-control text-brand-ink-muted transition-colors hover:bg-[#FEF3F2] hover:text-[#B42318]"
        >
          <Trash2 aria-hidden="true" className="h-4 w-4" />
        </button>
      )}
    </li>
  );
};
