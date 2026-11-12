import "server-only";

/**
 * Server-side client for the Cortex AI service (FastAPI).
 *
 * The AI service is protected by a shared API key, so it must NEVER be
 * called from the browser. Browser code calls our own route handlers in
 * src/app/api/ai/*, which use this module to forward the request with the
 * key attached. `server-only` makes the build fail if this file is ever
 * imported into client code.
 */

const AI_URL = (process.env.CORTEX_AI_URL ?? "http://localhost:8000").replace(
  /\/$/,
  "",
);
const AI_KEY = process.env.CORTEX_AI_API_KEY ?? "";

/**
 * TEMPORARY: one fixed site for every user. Once the backend exposes the
 * signed-in account's site id, read it from the session here instead.
 */
const TENANT_ID = process.env.CORTEX_AI_TENANT_ID ?? "demo";

/** Calls `/v1/tenants/{tenant}{path}` on the AI service. */
export async function aiFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const headers = new Headers(init.headers);
  if (AI_KEY) headers.set("X-API-Key", AI_KEY);

  return fetch(`${AI_URL}/v1/tenants/${encodeURIComponent(TENANT_ID)}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });
}

/** Standard response when the AI service can't be reached at all. */
export function aiUnavailable(): Response {
  return Response.json(
    { detail: "The AI service is not reachable. Make sure it is running." },
    { status: 503 },
  );
}

/**
 * Forwards an AI service response to the browser unchanged (status + JSON body).
 * Bodies are JSON on every AI endpoint except /chat/stream and 204 responses.
 */
export async function relayJson(response: Response): Promise<Response> {
  if (response.status === 204) return new Response(null, { status: 204 });
  const text = await response.text();
  return new Response(text, {
    status: response.status,
    headers: { "Content-Type": "application/json" },
  });
}

/** Wraps a handler so network errors (AI service down) become a 503. */
export async function withAiService(
  handler: () => Promise<Response>,
): Promise<Response> {
  try {
    return await handler();
  } catch (error) {
    console.error("[AI service] request failed:", error);
    return aiUnavailable();
  }
}
