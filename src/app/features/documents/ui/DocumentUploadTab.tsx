"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import { CheckCircle2, FileText, UploadCloud, X, XCircle } from "lucide-react";
import { useApiErrorHandler } from "@/app/shared/hooks/useApiErrorHandler";
import type { ApiError } from "@/app/shared/utils/errors/apiError";
import {
  canManage,
  canViewBilling,
  roleLabel,
  type Organization,
} from "@/app/features/organizations/types/organization.types";
import { formatBytes } from "@/app/features/organizations/utils/planFormat";
import {
  Notice,
  Spinner,
  mutedText,
  textLink,
} from "@/app/features/console/ui/consoleUi";
import {
  useDocumentUpload,
  type UploadState,
} from "../hooks/useDocumentUpload";
import {
  DOCUMENT_ACCEPT,
  DOCUMENT_RULES,
  type StartUploadRequest,
} from "../types/document.types";
import { describeFile } from "../utils/documentFiles";
import { documentStatusLabel } from "./DocumentStatusBadge";

const HINT = `PDF, Word (.docx), TXT, Markdown or CSV · up to ${formatBytes(DOCUMENT_RULES.maxFileSizeBytes)} each`;

// The list under the drop zone keeps the most recent files only.
const MAX_ITEMS = 20;

interface UploadItem {
  key: string;
  name: string;
  size: number;
  status: "queued" | "active" | "done" | "failed" | "cancelled" | "invalid";
  message?: string;
  /** Set for a 402: the plan, not the file, is the problem. */
  planLimit?: boolean;
}

type Queued = { key: string; file: File; request: StartUploadRequest };

/** What the backend's refusal means here, in one line. */
const failureMessage = (error: ApiError) =>
  error.hasFieldErrors ? Object.values(error.fieldErrors)[0] : error.message;

let nextKey = 0;

/**
 * The "Upload files" tab of the Knowledge base: files go to the backend
 * documents API of `organization` (start → PUT to storage → complete), one at
 * a time, with progress and a cancel per file.
 *
 * Keep it mounted while another tab is shown: unmounting cancels the upload
 * in progress (and deletes what it reserved).
 */
export const DocumentUploadTab = ({
  organization,
  onSettled,
  onBusyChange,
}: {
  organization: Organization;
  /** Reloads the file list; resolves once the backend answered. */
  onSettled: () => Promise<unknown>;
  /** True while files are uploading or waiting, so the page can lock the organization. */
  onBusyChange: (busy: boolean) => void;
}) => {
  const handleApiError = useApiErrorHandler();
  const { state, upload, cancel } = useDocumentUpload(organization.id);
  const [items, setItems] = useState<UploadItem[]>([]);
  const [dragging, setDragging] = useState(false);
  const queue = useRef<Queued[]>([]);
  const activeKey = useRef<string | null>(null);
  const running = useRef(false);
  const inputId = useId();

  // Unmounting aborts the current upload (the hook does that); nothing
  // waiting behind it may start afterwards.
  useEffect(
    () => () => {
      queue.current = [];
    },
    [],
  );

  const update = (key: string, patch: Partial<UploadItem>) =>
    setItems((prev) =>
      prev.map((item) => (item.key === key ? { ...item, ...patch } : item)),
    );

  const drain = async () => {
    if (running.current) return;
    running.current = true;
    onBusyChange(true);
    while (queue.current.length) {
      const { key, file, request } = queue.current.shift()!;
      activeKey.current = key;
      update(key, { status: "active" });
      const outcome = await upload(file, request);
      activeKey.current = null;

      if (outcome.kind === "done") {
        update(key, {
          status: "done",
          message: `Uploaded · ${documentStatusLabel(outcome.document.status)}`,
        });
      } else if (outcome.kind === "cancelled") {
        update(key, { status: "cancelled", message: "Cancelled" });
      } else {
        update(key, {
          status: "failed",
          message: failureMessage(outcome.error),
          planLimit: outcome.error.status === 402,
        });
        if (outcome.error.sessionExpired) {
          // Signed out: the rest can't go either.
          for (const rest of queue.current)
            update(rest.key, { status: "cancelled", message: "Cancelled" });
          queue.current = [];
          handleApiError(outcome.error);
        }
      }
      // A failed or cancelled upload may still have left a row behind.
      await onSettled();
    }
    running.current = false;
    onBusyChange(false);
  };

  const addFiles = (files: FileList | File[]) => {
    const added: UploadItem[] = [];
    for (const file of Array.from(files)) {
      const key = `upload-${(nextKey += 1)}`;
      const described = describeFile(file);
      if ("problem" in described) {
        added.push({
          key,
          name: file.name,
          size: file.size,
          status: "invalid",
          message: described.problem,
        });
      } else {
        added.push({ key, name: file.name, size: file.size, status: "queued" });
        queue.current.push({ key, file, request: described.request });
      }
    }
    setItems((prev) => [...added.reverse(), ...prev].slice(0, MAX_ITEMS));
    void drain();
  };

  const stop = (key: string) => {
    if (activeKey.current === key) {
      cancel();
      return;
    }
    queue.current = queue.current.filter((entry) => entry.key !== key);
    update(key, { status: "cancelled", message: "Cancelled" });
  };

  if (!canManage(organization.role)) {
    return (
      <Notice>
        You are a {roleLabel(organization.role).toLowerCase()} of{" "}
        {organization.name}. Only owners and admins can upload files; you can
        view and download them below.
      </Notice>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <label
        htmlFor={inputId}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          if (event.dataTransfer.files.length)
            addFiles(event.dataTransfer.files);
        }}
        className={clsx(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-control border border-dashed px-6 py-10 text-center transition-colors",
          "focus-within:border-primary-700",
          dragging
            ? "border-primary-700 bg-brand-wash"
            : "border-brand-ink/20 bg-brand-wash/40 hover:border-brand-ink/35",
        )}
      >
        <UploadCloud aria-hidden="true" className="h-8 w-8 text-primary-700" />
        <span className="text-sm font-medium text-brand-ink">
          Drop files here or{" "}
          <span className="text-primary-700 underline underline-offset-4">
            browse
          </span>
        </span>
        <span className="text-xs text-brand-ink-subtle">{HINT}</span>
        <input
          id={inputId}
          type="file"
          multiple
          accept={DOCUMENT_ACCEPT}
          className="sr-only"
          onChange={(event) => {
            if (event.target.files?.length) addFiles(event.target.files);
            event.target.value = ""; // allow choosing the same file again
          }}
        />
      </label>

      {items.length > 0 && (
        <ul
          aria-label="Uploads"
          className="flex flex-col divide-y divide-brand-ink/10 rounded-control border border-brand-ink/10"
        >
          {items.map((item) => (
            <UploadRow
              key={item.key}
              item={item}
              progress={item.status === "active" ? state : null}
              billingHref={
                item.planLimit && canViewBilling(organization.role)
                  ? `/console/organizations/${encodeURIComponent(organization.id)}?tab=billing`
                  : null
              }
              onStop={() => stop(item.key)}
            />
          ))}
        </ul>
      )}

      <p className="text-xs text-brand-ink-subtle">
        Files are stored with {organization.name} and listed under Uploaded
        files with the status Cortex reports.
      </p>
    </div>
  );
};

/**
 * The Upload files tab before an organization is chosen: still loading the
 * user's organizations, unable to, or the user has none yet.
 */
export const DocumentUploadUnavailable = ({
  status,
  message,
  onRetry,
}: {
  status: "loading" | "error" | "none";
  message?: string;
  onRetry: () => void;
}) => {
  if (status === "loading")
    return (
      <p
        role="status"
        className={clsx("flex items-center gap-2 text-sm", mutedText)}
      >
        <Spinner /> Loading your organizations…
      </p>
    );
  if (status === "error")
    return (
      <Notice tone="warning">
        Your organizations could not be loaded, so files can&apos;t be uploaded
        yet. {message}{" "}
        <button type="button" onClick={onRetry} className={textLink}>
          Try again
        </button>
      </Notice>
    );
  return (
    <Notice>
      Uploaded files belong to an organization, and you aren&apos;t in one yet.{" "}
      <Link href="/console/organizations" className={textLink}>
        Create an organization
      </Link>{" "}
      or accept an invitation to upload files.
    </Notice>
  );
};

const UploadRow = ({
  item,
  progress,
  billingHref,
  onStop,
}: {
  item: UploadItem;
  /** The upload's live state, for the file being sent now. */
  progress: UploadState | null;
  billingHref: string | null;
  onStop: () => void;
}) => {
  const failed = item.status === "failed" || item.status === "invalid";
  const stoppable = item.status === "queued" || item.status === "active";
  const percent =
    progress?.phase === "uploading" && progress.total > 0
      ? Math.min(100, Math.round((progress.sent / progress.total) * 100))
      : progress?.phase === "completing"
        ? 100
        : 0;

  let line: string | undefined = item.message;
  if (item.status === "queued") line = `Waiting · ${formatBytes(item.size)}`;
  if (item.status === "active")
    line =
      progress?.phase === "uploading"
        ? `${formatBytes(progress.sent)} of ${formatBytes(progress.total)} · ${percent}%`
        : progress?.phase === "completing"
          ? "Confirming…"
          : "Preparing…";

  return (
    <li className="flex items-center gap-3 px-3 py-2.5 text-sm">
      <FileText
        aria-hidden="true"
        className="h-4 w-4 shrink-0 text-brand-ink-subtle"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-brand-ink" title={item.name}>
          {item.name}
        </p>
        {item.status === "active" && (
          <div
            role="progressbar"
            aria-label={`Uploading ${item.name}`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-brand-ink/10"
          >
            <div
              className="h-full rounded-full bg-brand-teal transition-[width] duration-200 ease-out motion-reduce:transition-none"
              style={{ width: `${percent}%` }}
            />
          </div>
        )}
        <p
          aria-live="polite"
          className={clsx(
            "mt-0.5 text-xs tabular-nums",
            failed ? "text-status-error-text" : mutedText,
          )}
        >
          {line}
          {billingHref && (
            <>
              {" "}
              <Link href={billingHref} className={textLink}>
                See plan
              </Link>
            </>
          )}
        </p>
      </div>
      {item.status === "active" && progress?.phase !== "uploading" && (
        <Spinner className="text-primary-700" />
      )}
      {item.status === "done" && (
        <CheckCircle2
          aria-label="Uploaded"
          className="h-4 w-4 text-primary-700"
        />
      )}
      {failed && (
        <XCircle aria-label="Failed" className="h-4 w-4 text-status-error" />
      )}
      {stoppable && (
        <button
          type="button"
          onClick={onStop}
          aria-label={`Cancel ${item.name}`}
          title="Cancel"
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-control text-brand-ink-muted transition-colors hover:bg-brand-wash hover:text-brand-ink"
        >
          <X aria-hidden="true" className="h-4 w-4" />
        </button>
      )}
    </li>
  );
};
