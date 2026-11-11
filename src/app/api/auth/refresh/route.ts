import { backendPost, forwardCredentials, readJson, relay, withBackend } from "@/app/features/auth/server/backendClient";
import type { RefreshRequest } from "@/app/features/auth/types/auth-api.types";

/**
 * POST /api/auth/refresh — no body needed: the backend reads the
 * `cortex_refresh_token` cookie. `{ refreshToken }` is still accepted.
 * Refresh tokens are single-use; the browser must keep one refresh in flight
 * (see refreshSession in shared/utils/API/apiClient.ts).
 */
export async function POST(request: Request) {
  return withBackend(async () =>
    relay(await backendPost("/refresh", await optionalRefreshBody(request), forwardCredentials(request))),
  );
}

async function optionalRefreshBody(request: Request): Promise<RefreshRequest | undefined> {
  const token = (await readJson(request))?.refreshToken;
  return typeof token === "string" && token.trim() ? { refreshToken: token.trim() } : undefined;
}
