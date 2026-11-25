import { apiRequest } from "@/app/shared/utils/API/apiClient";
import type {
  DownloadLink,
  OrganizationDocument,
  StartUploadRequest,
  UploadSession,
} from "../types/document.types";

/**
 * Browser client for the Cortex documents API, via our
 * /api/organizations/{id}/documents/* proxies. Every call needs a signed-in
 * user: on 401 the session is refreshed once and the call retried. Every
 * method throws `ApiError`; pass it to useApiErrorHandler.
 *
 * Listing, reading and downloading are open to every member; starting,
 * completing and deleting are for owners and admins (403 otherwise). 404
 * when the organization or document does not exist or the user is not a
 * member.
 */

const documents = (organizationId: string) =>
  `/api/organizations/${encodeURIComponent(organizationId)}/documents`;
const one = (organizationId: string, documentId: string) =>
  `${documents(organizationId)}/${encodeURIComponent(documentId)}`;

export const documentsApi = {
  /** Newest first, including uploads still in progress (AwaitingUpload). */
  list: (organizationId: string, signal?: AbortSignal) =>
    apiRequest<OrganizationDocument[]>(documents(organizationId), {
      auth: true,
      signal,
    }),

  get: (organizationId: string, documentId: string, signal?: AbortSignal) =>
    apiRequest<OrganizationDocument>(one(organizationId, documentId), {
      auth: true,
      signal,
    }),

  /**
   * 201 → where to PUT the file. Reserves the plan's document and storage
   * share at once. 400 invalid file | 402 no subscription or limit reached.
   */
  startUpload: (
    organizationId: string,
    body: StartUploadRequest,
    signal?: AbortSignal,
  ) =>
    apiRequest<UploadSession>(documents(organizationId), {
      method: "POST",
      body,
      auth: true,
      signal,
    }),

  /**
   * Call after the PUT succeeded. 200 → the document, now Pending. Safe to
   * repeat. 409 file not in storage yet, or the upload failed | 400 stored
   * size differs (the backend already removed the document).
   */
  complete: (
    organizationId: string,
    documentId: string,
    signal?: AbortSignal,
  ) =>
    apiRequest<OrganizationDocument>(
      `${one(organizationId, documentId)}/complete`,
      { method: "POST", auth: true, signal },
    ),

  /** 204. Also cancels an upload in progress and frees its plan share. */
  remove: (organizationId: string, documentId: string) =>
    apiRequest<void>(one(organizationId, documentId), {
      method: "DELETE",
      auth: true,
    }),

  /** A short-lived link; ask for a new one each time. 409 no file yet. */
  downloadLink: (organizationId: string, documentId: string) =>
    apiRequest<DownloadLink>(`${one(organizationId, documentId)}/download`, {
      auth: true,
    }),
};
