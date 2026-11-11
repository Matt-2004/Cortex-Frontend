import {
  ApiError,
  apiErrorFromResponse,
  asSessionExpired,
  isAbortError,
  NETWORK_ERROR_STATUS,
  fallbackMessage,
} from "@/app/shared/utils/errors/apiError";

/**
 * Browser client for our same-origin /api/* routes.
 *
 * - Always sends cookies (`credentials: "include"`); the session lives in
 *   HttpOnly cookies, never in JS.
 * - Every failure is thrown as an `ApiError` (see errors/apiError.ts).
 * - Protected calls (`auth: true`) that get 401 refresh the session once and
 *   retry. If that fails, the backend's 401 is thrown with `sessionExpired: true`.
 */

const REFRESH_PATH = "/api/auth/refresh";
const REFRESH_LOCK_NAME = "cortex-auth-refresh";

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface ApiRequestOptions {
  method?: Method;
  /** Sent as JSON. Omit for no body. */
  body?: unknown;
  signal?: AbortSignal;
  /** Protected call: on 401, refresh the session once and retry. */
  auth?: boolean;
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const response = await send(path, options);

  if (response.status === 401 && options.auth) {
    try {
      await refreshSession();
    } catch (error) {
      // Refresh rejected (401) → session is gone. Other failures (network,
      // 5xx) are thrown as they are, without signing the user out.
      if (error instanceof ApiError && error.status === 401) throw asSessionExpired(error);
      throw error;
    }
    const retried = await send(path, options);
    if (retried.status === 401) throw asSessionExpired(await apiErrorFromResponse(retried));
    return parse<T>(retried);
  }

  return parse<T>(response);
}

async function send(path: string, options: ApiRequestOptions): Promise<Response> {
  const hasBody = options.body !== undefined;
  try {
    return await fetch(path, {
      method: options.method ?? (hasBody ? "POST" : "GET"),
      credentials: "include",
      cache: "no-store",
      headers: hasBody
        ? { "Content-Type": "application/json", Accept: "application/json" }
        : { Accept: "application/json" },
      body: hasBody ? JSON.stringify(options.body) : undefined,
      signal: options.signal,
    });
  } catch (error) {
    if (isAbortError(error)) throw error;
    throw new ApiError({
      status: NETWORK_ERROR_STATUS,
      message: fallbackMessage(NETWORK_ERROR_STATUS),
    });
  }
}

async function parse<T>(response: Response): Promise<T> {
  if (!response.ok) throw await apiErrorFromResponse(response);
  if (response.status === 204) return undefined as T;

  const text = await response.text();
  if (!text) return undefined as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new ApiError({ status: 502, message: fallbackMessage(502) });
  }
}

// ─── Session refresh ─────────────────────────────────────────────────
// Each refresh token works ONCE; reusing an old one revokes the session.
// So only one refresh may be in flight: shared by concurrent calls in this
// tab (`inFlight`) and serialised across tabs (Web Locks). A tab that waits
// on the lock refreshes with the already-rotated cookie, so no reuse.

let inFlight: Promise<void> | null = null;

/**
 * Refreshes the session cookies. Rejects with the backend's ApiError
 * (401 "Invalid or expired refresh token." when the session is gone).
 */
export function refreshSession(): Promise<void> {
  inFlight ??= withCrossTabLock(doRefresh).finally(() => {
    inFlight = null;
  });
  return inFlight;
}

async function doRefresh(): Promise<void> {
  const response = await send(REFRESH_PATH, { method: "POST" });
  if (!response.ok) throw await apiErrorFromResponse(response);
}

function withCrossTabLock(fn: () => Promise<void>): Promise<void> {
  if (typeof navigator !== "undefined" && navigator.locks?.request) {
    // Settles with fn's result; the DOM typings wrap it in an extra Promise.
    return navigator.locks.request(REFRESH_LOCK_NAME, fn) as unknown as Promise<void>;
  }
  return fn();
}
