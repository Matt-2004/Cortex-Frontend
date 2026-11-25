import { formatBytes } from "@/app/features/organizations/utils/planFormat";
import {
  DOCUMENT_RULES,
  DOCUMENT_TYPES,
  type StartUploadRequest,
} from "../types/document.types";

const extensionOf = (fileName: string) => {
  const dot = fileName.lastIndexOf(".");
  return dot === -1 ? "" : fileName.slice(dot + 1).toLowerCase();
};

/**
 * The start-upload body for a file, or the reason the backend would refuse
 * it. Same rules as the backend's StartUploadRequestValidator.
 */
export const describeFile = (
  file: File,
): { request: StartUploadRequest } | { problem: string } => {
  const type = DOCUMENT_TYPES[extensionOf(file.name)];
  if (!type)
    return {
      problem: "Choose a PDF, Word (.docx), TXT, Markdown or CSV file.",
    };
  if (file.size === 0) return { problem: "This file is empty." };
  if (file.size > DOCUMENT_RULES.maxFileSizeBytes)
    return {
      problem: `This file is ${formatBytes(file.size)}. The limit is ${formatBytes(DOCUMENT_RULES.maxFileSizeBytes)}.`,
    };
  if (file.name.length > DOCUMENT_RULES.maxFileNameLength)
    return {
      problem: `The file name is longer than ${DOCUMENT_RULES.maxFileNameLength} characters. Rename it and try again.`,
    };
  if (/[\\/\u0000-\u001f\u007f]/.test(file.name))
    return {
      problem:
        "The file name has characters the upload can't accept. Rename it and try again.",
    };

  return {
    request: {
      fileName: file.name,
      contentType: type.contentType,
      sizeBytes: file.size,
    },
  };
};

/** "PDF", "Markdown"…; the raw content type for anything unknown. */
export const documentTypeLabel = (contentType: string) =>
  Object.values(DOCUMENT_TYPES).find(
    (entry) => entry.contentType === contentType.toLowerCase(),
  )?.label ?? contentType;
