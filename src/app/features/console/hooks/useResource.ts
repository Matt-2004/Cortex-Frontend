"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
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
 * - A screen that navigation hides (Next keeps visited pages alive in
 *   `<Activity>`) loads again when it comes back, so it never shows data from
 *   before a change made on another page.
 * - `reload` resolves once the backend has answered: `true` when the new
 *   data is on screen. Await it after a change, before saying it is done.
 *
 * `load` must be stable (wrap it in useCallback); it re-runs when it changes.
 */
export function useResource<T>(load: (signal: AbortSignal) => Promise<T>) {
  const [resource, setResource] = useState<Resource<T>>({ status: "loading" });
  const handleApiError = useApiErrorHandler();
  const controller = useRef<AbortController | null>(null);
  const hasData = useRef(false);

  const reload = useCallback(async (): Promise<boolean> => {
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;

    try {
      const data = await load(current.signal);
      if (current.signal.aborted) return false;
      hasData.current = true;
      setResource({ status: "ready", data });
      return true;
    } catch (error) {
      if (current.signal.aborted || isAbortError(error)) return false;
      const apiError = toApiError(error);
      if (apiError.sessionExpired || hasData.current) {
        handleApiError(apiError);
        return false;
      }
      setResource({ status: "error", error: apiError });
      return false;
    }
  }, [load, handleApiError]);

  useEffect(() => {
    void reload();
    return () => controller.current?.abort();
  }, [reload]);

  // When the page is hidden, drop what it shows: the effect above loads it
  // again on return, and the skeleton stands in until the backend answers.
  useLayoutEffect(
    () => () => {
      hasData.current = false;
      setResource({ status: "loading" });
    },
    [],
  );

  /** Shows the loading state again, then reloads (the "Try again" button). */
  const retry = useCallback(() => {
    hasData.current = false;
    setResource({ status: "loading" });
    void reload();
  }, [reload]);

  return { resource, reload, retry };
}
