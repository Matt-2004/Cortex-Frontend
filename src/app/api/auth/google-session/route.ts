import { backendPost, badRequest, pickStrings, readJson, relay, withBackend } from "@/app/features/auth/server/backendClient";

/** POST /api/auth/google-session — body: { idToken } (Google ID token) */
export async function POST(request: Request) {
  const body = pickStrings(await readJson(request), ["idToken"] as const);
  if (!body) return badRequest("Google ID token is required.");

  return withBackend(async () => relay(await backendPost("/google-session", body)));
}
