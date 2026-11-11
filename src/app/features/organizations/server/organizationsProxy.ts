import "server-only";
import {
  backendApiFetch,
  badRequest,
  forwardCredentials,
  readJson,
  relay,
  withBackend,
} from "@/app/features/auth/server/backendClient";

type Method = "GET" | "POST" | "PUT" | "DELETE";

/**
 * Forwards a browser request to `/api/organizations{path}` on the Cortex
 * backend with the caller's session, and passes the backend's status and
 * body back unchanged.
 */
export function proxyOrganizations(
  request: Request,
  path: string,
  method: Method,
): Promise<Response> {
  return withBackend(async () => {
    const headers = forwardCredentials(request);
    let body: string | undefined;

    if (method === "POST" || method === "PUT") {
      const json = await readJson(request);
      if (!json) return badRequest("A JSON body is required.");
      headers.set("Content-Type", "application/json");
      body = JSON.stringify(json);
    }

    return relay(
      await backendApiFetch(`/organizations${path}`, { method, headers, body }),
    );
  });
}

/** A route parameter, safe to place in a backend path. */
export const segment = (value: string) => encodeURIComponent(value);
