"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/app/features/toast/hooks/useToast";
import {
  ApiError,
  isAbortError,
  toApiError,
} from "@/app/shared/utils/errors/apiError";
import { safeReturnTo, withReturnTo } from "@/app/shared/utils/returnTo";

export const SIGN_IN_PATH = "/auth/login";

/**
 * Sign-in URL for a session that just failed, returning to the current page.
 * `session=ended` tells the proxy to show the form even if stale cookies
 * remain; otherwise it would send the user straight back here, in a loop.
 */
export const sessionEndedSignInPath = () => {
  const path = `${SIGN_IN_PATH}?session=ended`;
  const returnTo = safeReturnTo(
    `${window.location.pathname}${window.location.search}`,
  );
  return returnTo ? withReturnTo(path, returnTo) : path;
};

export interface HandleApiErrorOptions {
  /**
   * Per-status handlers. Return `true` to mark the error as handled
   * (no toast is shown).
   */
  onStatus?: Partial<Record<number, (error: ApiError) => boolean | void>>;
  /** Receives 400 validation errors keyed by form field name. */
  onFieldErrors?: (errors: Record<string, string>) => void;
  /** Maps API field names onto form field names, e.g. { name: "firstName" }. */
  fieldMap?: Record<string, string>;
}

/**
 * Global error handler for API calls made from client components.
 *
 *   const handleApiError = useApiErrorHandler();
 *   try { … } catch (e) { handleApiError(e, { onFieldErrors: setServerErrors }); }
 *
 * - Aborted requests are ignored.
 * - Expired sessions → toast + redirect to sign-in.
 * - Validation errors → passed to `onFieldErrors` + toast.
 * - Toasts always show the backend's own message, unchanged.
 *
 * Returns the normalised ApiError (or null for aborts).
 */
export function useApiErrorHandler() {
  const { addToastMessage } = useToast();
  const router = useRouter();

  return useCallback(
    (error: unknown, options: HandleApiErrorOptions = {}): ApiError | null => {
      if (isAbortError(error)) return null;

      const apiError = toApiError(error);

      if (apiError.traceId) {
        console.error(
          `[api] ${apiError.status} ${apiError.message} (traceId: ${apiError.traceId})`,
        );
      }

      if (apiError.sessionExpired) {
        addToastMessage("error", apiError.message);
        router.push(sessionEndedSignInPath());
        return apiError;
      }

      if (options.onStatus?.[apiError.status]?.(apiError) === true) {
        return apiError;
      }

      if (apiError.hasFieldErrors && options.onFieldErrors) {
        const mapped: Record<string, string> = {};
        for (const [field, message] of Object.entries(apiError.fieldErrors)) {
          mapped[options.fieldMap?.[field] ?? field] = message;
        }
        options.onFieldErrors(mapped);
        addToastMessage("error", apiError.message);
        return apiError;
      }

      addToastMessage("error", apiError.message);
      return apiError;
    },
    [addToastMessage, router],
  );
}
