import "server-only";

/**
 * Server-side client for the Cortex backend auth API (ASP.NET, /api/auth/*).
 *
 * Browser code calls our own route handlers in src/app/api/auth/*, which use
 * this module to forward the request. The backend's status and body are
 * passed through unchanged — no response wrapper.
 */

const BACKEND_URL = (process.env.CORTEX_BACKEND_URL ?? "http://localhost:5203").trim().replace(/\/$/, "");

/** Calls `/api/auth{path}` on the backend. */
export async function backendFetch(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${BACKEND_URL}/api/auth${path}`, { ...init, cache: "no-store" });
}

/** Calls `/api{path}` on the backend, for everything outside `/api/auth`. */
export async function backendApiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${BACKEND_URL}/api${path}`, { ...init, cache: "no-store" });
}

/** POSTs a JSON body to `/api/auth{path}`. */
export function backendPost(path: string, body?: unknown, headers?: HeadersInit): Promise<Response> {
  const h = new Headers(headers);
  if (body !== undefined) h.set("Content-Type", "application/json");
  return backendFetch(path, {
    method: "POST",
    headers: h,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

/** Session cookies the backend reads (HttpOnly, set by the backend). */
const SESSION_COOKIE_PREFIX = "cortex_";

/**
 * Credentials to forward to the backend: the caller's
 * `Authorization: Bearer …` header and its `cortex_*` session cookies.
 * Other cookies (e.g. NextAuth's) are not forwarded.
 */
export function forwardCredentials(request: Request): Headers {
  const headers = new Headers();
  const authorization = request.headers.get("authorization");
  if (authorization) headers.set("Authorization", authorization);

  const sessionCookies = (request.headers.get("cookie") ?? "")
    .split(";")
    .map((part) => part.trim())
    .filter((part) => part.startsWith(SESSION_COOKIE_PREFIX));
  if (sessionCookies.length) headers.set("Cookie", sessionCookies.join("; "));

  return headers;
}

/** Reads a JSON request body; returns null if it is missing or invalid. */
export async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  const body = await request.json().catch(() => null);
  return body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : null;
}

/** Returns the named fields as trimmed strings, or null if any is missing/empty. */
export function pickStrings<K extends string>(
  body: Record<string, unknown> | null,
  keys: readonly K[],
): Record<K, string> | null {
  if (!body) return null;
  const out = {} as Record<K, string>;
  for (const key of keys) {
    const value = body[key];
    if (typeof value !== "string" || value.trim() === "") return null;
    out[key] = key === "password" ? value : value.trim();
  }
  return out;
}

const STATUS_TITLES: Record<number, string> = {
  400: "Bad Request",
  500: "Internal Server Error",
  502: "Bad Gateway",
  503: "Service Unavailable",
};

/** An `application/problem+json` response, same shape as the backend's errors. */
export function problem(status: number, detail: string): Response {
  return Response.json(
    { title: STATUS_TITLES[status] ?? "Error", status, detail },
    { status, headers: { "Content-Type": "application/problem+json" } },
  );
}

export function badRequest(detail: string): Response {
  return problem(400, detail);
}

/**
 * Forwards a backend response to the browser unchanged (status + body,
 * including the backend's error messages), plus its `Set-Cookie` headers so
 * the session cookies land on our origin.
 * The only exception: a 5xx whose body is not JSON. In development the
 * backend returns full stack traces as plain text, which must not reach the
 * browser; that body is logged and replaced.
 */
export async function relay(response: Response): Promise<Response> {
  const headers = new Headers();
  for (const cookie of response.headers.getSetCookie()) headers.append("Set-Cookie", cookie);

  if (response.status === 204 || response.status === 304) {
    return new Response(null, { status: response.status, headers });
  }

  const contentType = response.headers.get("content-type") ?? "";
  const text = await response.text();

  if (response.status >= 500 && !contentType.includes("json")) {
    console.error("[auth backend]", response.status, text.slice(0, 500));
    const safe = problem(response.status, "Something went wrong on the server. Please try again.");
    safe.headers.forEach((value, key) => headers.set(key, value));
    return new Response(safe.body, { status: response.status, headers });
  }

  headers.set("Content-Type", contentType || "application/json");
  return new Response(text, { status: response.status, headers });
}

/** Wraps a handler so network errors (backend down) become a 503. */
export async function withBackend(handler: () => Promise<Response>): Promise<Response> {
  try {
    return await handler();
  } catch (error) {
    console.error("[auth backend] request failed:", error);
    return problem(503, "The server is not reachable. Make sure it is running.");
  }
}
