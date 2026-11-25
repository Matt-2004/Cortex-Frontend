"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  isAbortError,
  toApiError,
  type ApiError,
} from "@/app/shared/utils/errors/apiError";
import { documentsApi } from "../api/documentsApi";
import type {
  OrganizationDocument,
  StartUploadRequest,
} from "../types/document.types";
import { uploadToStorage } from "../utils/uploadToStorage";

export type UploadState =
  | { phase: "idle" }
  | { phase: "starting"; fileName: string }
  | { phase: "uploading"; fileName: string; sent: number; total: number }
  | { phase: "completing"; fileName: string }
  | { phase: "failed"; fileName: string; error: ApiError };

export type UploadOutcome =
  | { kind: "done"; document: OrganizationDocument }
  | { kind: "cancelled" }
  | { kind: "failed"; error: ApiError };

// `complete` answers 409 while storage hasn't settled the object yet; it is
// safe to repeat, so a short wait and a retry cover that window.
const COMPLETE_RETRY_DELAYS_MS = [1000, 2500];

/**
 * Runs the backend's three-step upload: start (reserves the plan share and
 * returns a presigned URL) → PUT the bytes to storage → complete.
 *
 * Anything that stops it after the start — a failure, Cancel, or leaving
 * the page — deletes the reserved document, because the backend has no job
 * that clears abandoned uploads and they keep counting against the plan.
 */
export function useDocumentUpload(organizationId: string) {
  const [state, setState] = useState<UploadState>({ phase: "idle" });
  const controller = useRef<AbortController | null>(null);

  const busy =
    state.phase === "starting" ||
    state.phase === "uploading" ||
    state.phase === "completing";

  const upload = useCallback(
    async (file: File, request: StartUploadRequest): Promise<UploadOutcome> => {
      controller.current?.abort();
      const current = new AbortController();
      controller.current = current;
      const { signal } = current;
      const fileName = request.fileName;

      // Set once the backend created the document; cleared once it is complete.
      let reservedId: string | null = null;
      setState({ phase: "starting", fileName });

      try {
        const session = await documentsApi.startUpload(
          organizationId,
          request,
          signal,
        );
        reservedId = session.document.id;

        setState({ phase: "uploading", fileName, sent: 0, total: file.size });
        await uploadToStorage(session, file, {
          signal,
          onProgress: (sent, total) =>
            setState({ phase: "uploading", fileName, sent, total }),
        });

        setState({ phase: "completing", fileName });
        const document = await completeWithRetry(
          organizationId,
          session.document.id,
          signal,
        );
        reservedId = null;
        setState({ phase: "idle" });
        return { kind: "done", document };
      } catch (caught) {
        const outcome: UploadOutcome =
          signal.aborted || isAbortError(caught)
            ? { kind: "cancelled" }
            : { kind: "failed", error: toApiError(caught) };
        setState(
          outcome.kind === "failed"
            ? { phase: "failed", fileName, error: outcome.error }
            : { phase: "idle" },
        );
        // Awaited, so a list reloaded afterwards no longer shows the row.
        if (reservedId) await release(organizationId, reservedId);
        return outcome;
      } finally {
        if (controller.current === current) controller.current = null;
      }
    },
    [organizationId],
  );

  const cancel = useCallback(() => controller.current?.abort(), []);
  const reset = useCallback(() => setState({ phase: "idle" }), []);

  // Leaving the tab or page cancels the upload (and so frees its share).
  useEffect(() => () => controller.current?.abort(), []);

  // Closing or reloading the browser tab can't clean up: warn first.
  useEffect(() => {
    if (!busy) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [busy]);

  return { state, busy, upload, cancel, reset };
}

async function completeWithRetry(
  organizationId: string,
  documentId: string,
  signal: AbortSignal,
): Promise<OrganizationDocument> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await documentsApi.complete(organizationId, documentId, signal);
    } catch (caught) {
      const delay = COMPLETE_RETRY_DELAYS_MS[attempt];
      if (
        toApiError(caught).status !== 409 ||
        delay === undefined ||
        isAbortError(caught)
      )
        throw caught;
      await wait(delay, signal);
    }
  }
}

function wait(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(resolve, ms);
    signal.addEventListener(
      "abort",
      () => {
        window.clearTimeout(timer);
        reject(new DOMException("Upload cancelled.", "AbortError"));
      },
      { once: true },
    );
  });
}

/**
 * Best effort: the document may already be gone (the backend removes it on
 * a size mismatch). If this fails too, the row stays as AwaitingUpload in
 * the list, where it can be deleted by hand.
 */
async function release(organizationId: string, documentId: string) {
  try {
    await documentsApi.remove(organizationId, documentId);
  } catch {
    // see above
  }
}
