import { backendPost, badRequest, pickStrings, readJson, relay, withBackend } from "@/app/features/auth/server/backendClient";

/** POST /api/auth/resend-verification — body: { email } */
export async function POST(request: Request) {
  const body = pickStrings(await readJson(request), ["email"] as const);
  if (!body) return badRequest("Email is required.");

  return withBackend(async () => relay(await backendPost("/resend-verification", body)));
}
