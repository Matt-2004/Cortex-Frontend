/**
 * Shapes of the Cortex documents API, matching the backend's
 * Cortex.Application.Documents.Dtos and Cortex.Domain.Enums.DocumentStatus.
 * JSON is camelCase; enums arrive as their names; dates are ISO 8601 UTC.
 */

/**
 * AwaitingUpload: created, file not confirmed yet. Pending: stored, waiting to
 * be processed. Processing / Ready / Failed: set by processing on the backend.
 */
export type DocumentStatus =
  "AwaitingUpload" | "Pending" | "Processing" | "Ready" | "Failed";

/** `DocumentDto` */
export interface OrganizationDocument {
  id: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  status: DocumentStatus;
  /** Why it failed, when status is Failed. */
  error: string | null;
  uploadedByUserId: string;
  createdAt: string;
  updatedAt: string;
}

/** `StartUploadRequest` for POST …/documents */
export interface StartUploadRequest {
  fileName: string;
  contentType: string;
  sizeBytes: number;
}

/** `UploadSessionDto`: where and how to PUT the file, and until when. */
export interface UploadSession {
  document: OrganizationDocument;
  uploadUrl: string;
  method: string;
  /** Send exactly these with the PUT, or storage rejects it. */
  headers: Record<string, string>;
  expiresAt: string;
}

/** `DownloadLinkDto` */
export interface DownloadLink {
  url: string;
  expiresAt: string;
}

/**
 * Mirrors Cortex.Application.Documents.DocumentRules, so a bad file is
 * refused before anything is reserved. The backend still checks them.
 */
export const DOCUMENT_RULES = {
  maxFileNameLength: 255,
  maxFileSizeBytes: 50 * 1024 * 1024,
} as const;

/**
 * Allowed types, keyed by file extension. The extension decides, not
 * `File.type`: browsers leave it empty for .md and Windows reports .csv as
 * application/vnd.ms-excel, which the backend refuses.
 */
export const DOCUMENT_TYPES: Record<
  string,
  { contentType: string; label: string }
> = {
  pdf: { contentType: "application/pdf", label: "PDF" },
  docx: {
    contentType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    label: "Word",
  },
  txt: { contentType: "text/plain", label: "Text" },
  md: { contentType: "text/markdown", label: "Markdown" },
  markdown: { contentType: "text/markdown", label: "Markdown" },
  csv: { contentType: "text/csv", label: "CSV" },
};

/** For the file input's `accept`. */
export const DOCUMENT_ACCEPT = Object.keys(DOCUMENT_TYPES)
  .map((extension) => `.${extension}`)
  .join(",");
