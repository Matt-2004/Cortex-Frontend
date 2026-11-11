import { backendFetch, forwardCredentials, relay, withBackend } from "@/app/features/auth/server/backendClient";

/**
 * GET /api/auth/me — authenticated by the `cortex_access_token` cookie or an
 * `Authorization: Bearer …` header. 401 → refresh once, then retry.
 */
export async function GET(request: Request) {
  return withBackend(async () => relay(await backendFetch("/me", { headers: forwardCredentials(request) })));
}
