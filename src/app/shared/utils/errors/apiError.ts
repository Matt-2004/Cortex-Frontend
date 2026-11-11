import type { ProblemDetails } from "@/app/shared/types.ts/problem-details";

/** Status used when the request never got a response (offline, DNS, CORS…). */
export const NETWORK_ERROR_STATUS = 0;

const FALLBACK_MESSAGES: Record<string, string> = {
  network: "Unable to connect. Check your internet connection and try again.",
  400: "Please check your input and try again.",
  401: "You need to sign in to continue.",
  403: "You don't have permission to do that.",
  404: "We couldn't find what you were looking for.",
  409: "That conflicts with existing data.",
  429: "Too many attempts. Please wait a moment and try again.",
  server: "Something went wrong on our side. Please try again in a moment.",
  default: "Something went wrong. Please try again.",
};

/** Generic, user-safe message for a status code. */
export function fallbackMessage(status: number): string {
  if (status === NETWORK_ERROR_STATUS) return FALLBACK_MESSAGES.network;
  if (status >= 500) return FALLBACK_MESSAGES.server;
  return FALLBACK_MESSAGES[status] ?? FALLBACK_MESSAGES.default;
}

interface ApiErrorInit {
  status: number;
  message: string;
  title?: string;
  fieldErrors?: Record<string, string>;
  traceId?: string;
  sessionExpired?: boolean;
}

/**
 * The one error type thrown by every browser API call.
 * Branch on `status`; show `message`; map `fieldErrors` onto form fields.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly title?: string;
  /** First message per field, keyed by request field name (camelCase). */
  readonly fieldErrors: Record<string, string>;
  readonly traceId?: string;
  /** True when a protected call got 401 and the refresh also failed. */
  readonly sessionExpired: boolean;

  constructor(init: ApiErrorInit) {
    super(init.message);
    this.name = "ApiError";
    this.status = init.status;
    this.title = init.title;
    this.fieldErrors = init.fieldErrors ?? {};
    this.traceId = init.traceId;
    this.sessionExpired = init.sessionExpired ?? false;
  }

  get isNetworkError() {
    return this.status === NETWORK_ERROR_STATUS;
  }

  get hasFieldErrors() {
    return Object.keys(this.fieldErrors).length > 0;
  }
}

/** Same error (backend message kept), flagged as an expired session. */
export function asSessionExpired(error: ApiError): ApiError {
  return new ApiError({
    status: error.status,
    message: error.message,
    title: error.title,
    fieldErrors: error.fieldErrors,
    traceId: error.traceId,
    sessionExpired: true,
  });
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/**
 * ASP.NET may key errors as "Email", "$.email" or "request.Email".
 * Normalise to the camelCase request field name ("email").
 */
function normalizeFieldKey(key: string): string {
  const last = key.split(".").pop()?.replace(/^\$/, "") ?? key;
  return last ? last.charAt(0).toLowerCase() + last.slice(1) : key;
}

export function normalizeFieldErrors(
  errors: ProblemDetails["errors"],
): Record<string, string> {
  const out: Record<string, string> = {};
  if (!errors || typeof errors !== "object") return out;
  for (const [key, value] of Object.entries(errors)) {
    const message = Array.isArray(value) ? value[0] : value;
    if (typeof message !== "string" || !message) continue;
    const field = normalizeFieldKey(key);
    if (field && !(field in out)) out[field] = message;
  }
  return out;
}

function isProblemDetails(value: unknown): value is ProblemDetails {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/** Builds an ApiError from a non-2xx fetch Response. Never throws. */
export async function apiErrorFromResponse(
  response: Response,
): Promise<ApiError> {
  let body: unknown = null;
  try {
    body = JSON.parse(await response.text());
  } catch {
    // Non-JSON body (HTML error page, plain-text stack trace…): never shown.
  }

  const problem = isProblemDetails(body) ? body : {};
  const status = response.status;
  const text = (value: unknown) =>
    typeof value === "string" && value.trim() ? value : undefined;

  return new ApiError({
    status,
    // The backend's own message, as sent: `detail`, else `title`.
    // Generic text only when the response carries no message at all.
    message: text(problem.detail) ?? text(problem.title) ?? fallbackMessage(status),
    title: typeof problem.title === "string" ? problem.title : undefined,
    fieldErrors: normalizeFieldErrors(problem.errors),
    traceId: typeof problem.traceId === "string" ? problem.traceId : undefined,
  });
}

/** Normalises anything thrown into an ApiError. */
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (error instanceof TypeError) {
    // fetch() rejects with TypeError when there is no response.
    return new ApiError({
      status: NETWORK_ERROR_STATUS,
      message: fallbackMessage(NETWORK_ERROR_STATUS),
    });
  }
  return new ApiError({ status: 500, message: fallbackMessage(500) });
}

export function isAbortError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { name?: unknown }).name === "AbortError"
  );
}
