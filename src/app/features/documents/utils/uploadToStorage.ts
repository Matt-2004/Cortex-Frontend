import {
  ApiError,
  NETWORK_ERROR_STATUS,
} from "@/app/shared/utils/errors/apiError";
import type { UploadSession } from "../types/document.types";

// The browser sets these itself; trying to set them only logs a warning.
const BROWSER_HEADERS = new Set(["content-length", "host"]);

/**
 * PUTs a file to the presigned storage URL from an upload session.
 *
 * This is the one request that leaves our /api/*: the bytes go straight to
 * storage (S3, or MinIO locally) as the backend designed it, so a 50 MB file
 * never passes through Next. The URL is signed for this one object and
 * carries no session, so no cookies or tokens are sent.
 *
 * XMLHttpRequest instead of fetch because only it reports upload progress.
 * Rejects with an AbortError when `signal` aborts, else with an ApiError.
 */
export function uploadToStorage(
  session: UploadSession,
  file: File,
  {
    signal,
    onProgress,
  }: { signal: AbortSignal; onProgress: (sent: number, total: number) => void },
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException("Upload cancelled.", "AbortError"));
      return;
    }

    const xhr = new XMLHttpRequest();
    const abort = () => xhr.abort();
    signal.addEventListener("abort", abort, { once: true });
    const settle = (finish: () => void) => {
      signal.removeEventListener("abort", abort);
      finish();
    };

    xhr.open(session.method || "PUT", session.uploadUrl);
    for (const [name, value] of Object.entries(session.headers ?? {})) {
      if (!BROWSER_HEADERS.has(name.toLowerCase()))
        xhr.setRequestHeader(name, value);
    }

    xhr.upload.onprogress = (event) => {
      onProgress(
        event.loaded,
        event.lengthComputable ? event.total : file.size,
      );
    };
    xhr.onload = () =>
      settle(() => {
        if (xhr.status >= 200 && xhr.status < 300) resolve();
        else reject(storageError(xhr.status, session.expiresAt));
      });
    // No response at all: offline, or storage refused the origin (CORS).
    xhr.onerror = () =>
      settle(() =>
        reject(
          new ApiError({
            status: NETWORK_ERROR_STATUS,
            message:
              "The file could not reach storage. Check your connection and try again.",
          }),
        ),
      );
    xhr.onabort = () =>
      settle(() => reject(new DOMException("Upload cancelled.", "AbortError")));

    xhr.send(file);
  });
}

function storageError(status: number, expiresAt: string): ApiError {
  // Storage answers 403 both for an expired link and for a signature that
  // doesn't match (wrong type or size). The clock tells which one it was.
  const expired = Date.parse(expiresAt) <= Date.now();
  return new ApiError({
    status,
    message: expired
      ? "The upload link expired before the file was sent. Try again."
      : status === 403
        ? "Storage refused the file. Try again, or choose another file."
        : `Storage could not save the file (${status}). Try again.`,
  });
}
