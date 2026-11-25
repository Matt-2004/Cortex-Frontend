"use client";

import { useState, type ReactNode } from "react";
import { clsx } from "clsx";
import { Download, RefreshCw, Trash2 } from "lucide-react";
import { useToast } from "@/app/features/toast/hooks/useToast";
import { useApiErrorHandler } from "@/app/shared/hooks/useApiErrorHandler";
import {
  canManage,
  type Organization,
} from "@/app/features/organizations/types/organization.types";
import { formatBytes } from "@/app/features/organizations/utils/planFormat";
import {
  EmptyTableRow,
  Modal,
  Panel,
  PanelHeader,
  SkeletonRows,
  Spinner,
  buttonDanger,
  buttonGhost,
  buttonSecondary,
  formatDate,
  mutedText,
  rowLook,
  tableLook,
  tdLook,
  thLook,
} from "@/app/features/console/ui/consoleUi";
import { documentsApi } from "../api/documentsApi";
import type { OrganizationDocuments } from "../hooks/useOrganizationDocuments";
import type {
  DocumentStatus,
  OrganizationDocument,
} from "../types/document.types";
import { documentTypeLabel } from "../utils/documentFiles";
import { DocumentStatusBadge } from "./DocumentStatusBadge";

// Download needs a stored file: the backend answers 409 for these.
const NO_FILE: ReadonlySet<DocumentStatus> = new Set([
  "AwaitingUpload",
  "Failed",
]);

const DOCUMENT_COLUMNS = [
  "",
  "hidden w-24 sm:table-cell",
  "hidden w-24 sm:table-cell",
  "w-32",
  "hidden w-32 md:table-cell",
  "w-28",
];

/**
 * The files uploaded to one organization, as the backend lists them. Every
 * member may list and download them; owners and admins also delete (the
 * backend answers 403 to anyone else). Uploading happens in the Add content
 * panel, which shares `documents` with this list.
 */
export const DocumentsPanel = ({
  organization,
  documents,
  picker,
}: {
  organization: Organization;
  documents: OrganizationDocuments;
  /** The organization picker, shown in the header. */
  picker?: ReactNode;
}) => {
  const organizationId = organization.id;
  const manageable = canManage(organization.role);
  const { resource, usage, retry, refresh } = documents;
  const { addToastMessage } = useToast();
  const handleApiError = useApiErrorHandler();
  const [refreshing, setRefreshing] = useState(false);
  const [deleting, setDeleting] = useState<OrganizationDocument | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  const refreshByHand = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const download = async (document: OrganizationDocument) => {
    setDownloading(document.id);
    try {
      // A fresh link every time: each one stops working after a few minutes.
      const link = await documentsApi.downloadLink(organizationId, document.id);
      // The link answers with "attachment", so the page stays where it is.
      window.location.assign(link.url);
    } catch (caught) {
      handleApiError(caught, {
        onStatus: {
          404: () => {
            addToastMessage("error", `${document.fileName} no longer exists.`);
            void refresh();
            return true;
          },
          // The status changed since the list loaded: show the current one.
          409: (error) => {
            addToastMessage("error", error.message);
            void refresh();
            return true;
          },
        },
      });
    } finally {
      setDownloading(null);
    }
  };

  const rows = resource.status === "ready" ? resource.data : [];
  const subscription = usage.status === "ready" ? usage.data : null;

  return (
    <>
      <Panel className="overflow-hidden">
        <section aria-labelledby="uploaded-files">
          <PanelHeader
            id="uploaded-files"
            title="Uploaded files"
            count={resource.status === "ready" ? rows.length : null}
            description={
              subscription
                ? `Stored with ${organization.name} · ${subscription.usage.documentCount.toLocaleString()} of ${subscription.plan.maxDocuments.toLocaleString()} documents · ${formatBytes(subscription.usage.storageBytes)} of ${formatBytes(subscription.plan.maxStorageBytes)}`
                : `Stored with ${organization.name}`
            }
            actions={
              <>
                {picker}
                <button
                  type="button"
                  onClick={refreshByHand}
                  disabled={refreshing || resource.status === "loading"}
                  className={buttonSecondary}
                >
                  {refreshing ? (
                    <Spinner />
                  ) : (
                    <RefreshCw aria-hidden="true" className="h-4 w-4" />
                  )}
                  Refresh
                </button>
              </>
            }
          />
          <table className={clsx(tableLook, "table-fixed")}>
            <thead>
              <tr>
                <th scope="col" className={thLook}>
                  Name
                </th>
                <th
                  scope="col"
                  className={clsx(thLook, "hidden w-24 sm:table-cell")}
                >
                  Type
                </th>
                <th
                  scope="col"
                  className={clsx(thLook, "hidden w-24 sm:table-cell")}
                >
                  Size
                </th>
                <th scope="col" className={clsx(thLook, "w-32")}>
                  Status
                </th>
                <th
                  scope="col"
                  className={clsx(thLook, "hidden w-32 md:table-cell")}
                >
                  Added
                </th>
                <th scope="col" className={clsx(thLook, "w-28")}>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody aria-busy={resource.status === "loading"}>
              {resource.status === "loading" && (
                <SkeletonRows columns={DOCUMENT_COLUMNS} />
              )}
              {resource.status === "error" && (
                <EmptyTableRow
                  colSpan={6}
                  title={
                    resource.error.status === 403 ||
                    resource.error.status === 404
                      ? "These files are not available to you"
                      : "The files could not be loaded"
                  }
                >
                  <p>{resource.error.message}</p>
                  <button
                    type="button"
                    onClick={retry}
                    className={clsx(buttonSecondary, "mt-3")}
                  >
                    Try again
                  </button>
                </EmptyTableRow>
              )}
              {resource.status === "ready" && rows.length === 0 && (
                <EmptyTableRow colSpan={6} title="No files yet">
                  {manageable
                    ? "Upload a PDF, Word, TXT, Markdown or CSV file above."
                    : "Owners and admins can upload files here."}
                </EmptyTableRow>
              )}
              {rows.map((document) => (
                <DocumentRow
                  key={document.id}
                  document={document}
                  manageable={manageable}
                  downloading={downloading === document.id}
                  onDownload={() => download(document)}
                  onDelete={() => setDeleting(document)}
                />
              ))}
            </tbody>
          </table>
        </section>
      </Panel>

      {manageable && (
        <DeleteDocumentModal
          organizationId={organizationId}
          document={deleting}
          onClose={() => setDeleting(null)}
          onDeleted={refresh}
        />
      )}
    </>
  );
};

const DocumentRow = ({
  document,
  manageable,
  downloading,
  onDownload,
  onDelete,
}: {
  document: OrganizationDocument;
  manageable: boolean;
  downloading: boolean;
  onDownload: () => void;
  onDelete: () => void;
}) => {
  const type = documentTypeLabel(document.contentType);
  const size = formatBytes(document.sizeBytes);
  const canDownload = !NO_FILE.has(document.status);

  return (
    <tr className={rowLook}>
      <td className={tdLook}>
        <p className="truncate font-medium" title={document.fileName}>
          {document.fileName}
        </p>
        <p className={clsx("truncate text-xs sm:hidden", mutedText)}>
          {type} · {size}
        </p>
        {document.status === "Failed" && document.error && (
          <p
            className="truncate text-xs text-status-error-text"
            title={document.error}
          >
            {document.error}
          </p>
        )}
      </td>
      <td className={clsx(tdLook, "hidden truncate sm:table-cell", mutedText)}>
        {type}
      </td>
      <td
        className={clsx(
          tdLook,
          "hidden whitespace-nowrap tabular-nums sm:table-cell",
          mutedText,
        )}
      >
        {size}
      </td>
      <td className={tdLook}>
        <DocumentStatusBadge status={document.status} />
      </td>
      <td
        className={clsx(
          tdLook,
          "hidden whitespace-nowrap md:table-cell",
          mutedText,
        )}
      >
        {formatDate(document.createdAt)}
      </td>
      <td className={clsx(tdLook, "pr-2")}>
        <div className="flex justify-end gap-0.5">
          <button
            type="button"
            onClick={onDownload}
            disabled={!canDownload || downloading}
            aria-label={`Download ${document.fileName}`}
            title={canDownload ? "Download" : "No stored file to download"}
            className={buttonGhost}
          >
            {downloading ? (
              <Spinner />
            ) : (
              <Download aria-hidden="true" className="h-4 w-4" />
            )}
          </button>
          {manageable && (
            <button
              type="button"
              onClick={onDelete}
              aria-label={`Delete ${document.fileName}`}
              title="Delete"
              className={clsx(
                buttonGhost,
                "hover:bg-status-error-bg hover:text-status-error-text",
              )}
            >
              <Trash2 aria-hidden="true" className="h-4 w-4" />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
};

const DeleteDocumentModal = ({
  organizationId,
  document,
  onClose,
  onDeleted,
}: {
  organizationId: string;
  /** The document to delete; null keeps the dialog closed. */
  document: OrganizationDocument | null;
  onClose: () => void;
  onDeleted: () => Promise<unknown>;
}) => {
  const { addToastMessage } = useToast();
  const handleApiError = useApiErrorHandler();
  const [busy, setBusy] = useState(false);

  const remove = async () => {
    if (!document) return;
    setBusy(true);
    try {
      await documentsApi.remove(organizationId, document.id);
      await onDeleted();
      addToastMessage("success", `${document.fileName} was deleted.`);
      onClose();
    } catch (caught) {
      handleApiError(caught, {
        onStatus: {
          // Someone else got there first: the result is the same.
          404: () => {
            addToastMessage(
              "info",
              `${document.fileName} was already deleted.`,
            );
            void onDeleted();
            onClose();
            return true;
          },
        },
      });
    } finally {
      setBusy(false);
    }
  };

  const unfinished = document?.status === "AwaitingUpload";

  return (
    <Modal
      open={document !== null}
      onClose={() => {
        if (!busy) onClose();
      }}
      title="Delete this file?"
      description={
        document &&
        (unfinished
          ? `This cancels the upload of ${document.fileName} and frees its share of the plan.`
          : `${document.fileName} and its stored file are removed for good. This can't be undone.`)
      }
    >
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          className={buttonSecondary}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={remove}
          disabled={busy}
          className={buttonDanger}
        >
          {busy && <Spinner />}
          Delete
        </button>
      </div>
    </Modal>
  );
};
