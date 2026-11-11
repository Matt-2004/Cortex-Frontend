import { backendPost, forwardCredentials, readJson, relay, withBackend } from "@/app/features/auth/server/backendClient";

/**
 * POST /api/auth/logout — no body needed: the backend reads the
 * `cortex_refresh_token` cookie. Always 204; clears the session cookies.
 */
export async function POST(request: Request) {
  const token = (await readJson(request))?.refreshToken;
  const body = typeof token === "string" && token.trim() ? { refreshToken: token.trim() } : undefined;

  return withBackend(async () => relay(await backendPost("/logout", body, forwardCredentials(request))));
}
