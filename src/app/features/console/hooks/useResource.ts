"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useApiErrorHandler } from "@/app/shared/hooks/useApiErrorHandler";
import {
  isAbortError,
  toApiError,
  type ApiError,
} from "@/app/shared/utils/errors/apiError";

export type Resource<T> =
  | { status: "loading" }
  | { status: "error"; error: ApiError }
  | { status: "ready"; data: T };

/**
 * Loads data for a console screen and keeps it reloadable.
 *
 * - The first load that fails shows an error state (`status: "error"`).
 * - A reload that fails keeps the data already on screen and shows a toast.
 * - An expired session goes through the global handler (toast + sign-in).
 *
 * `load` must be stable (wrap it in useCallback); it re-runs when it changes.
 */
export function useResource<T>(load: (signal: AbortSignal) => Promise<T>) {
  const [resource, setResource] = useState<Resource<T>>({ status: "loading" });
  const handleApiError = useApiErrorHandler();
  const controller = useRef<AbortController | null>(null);
  const hasData = useRef(false);

  const reload = useCallback(async () => {
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;

    try {
      const data = await load(current.signal);
      if (current.signal.aborted) return;
      hasData.current = true;
      setResource({ status: "ready", data });
    } catch (error) {
      if (current.signal.aborted || isAbortError(error)) return;
      const apiError = toApiError(error);
      if (apiError.sessionExpired || hasData.current) {
        handleApiError(apiError);
        return;
      }
      setResource({ status: "error", error: apiError });
    }
  }, [load, handleApiError]);

  useEffect(() => {
    void reload();
    return () => controller.current?.abort();
  }, [reload]);

  /** Shows the loading state again, then reloads (the "Try again" button). */
  const retry = useCallback(() => {
    hasData.current = false;
    setResource({ status: "loading" });
    void reload();
  }, [reload]);

  return { resource, reload, retry };
}
