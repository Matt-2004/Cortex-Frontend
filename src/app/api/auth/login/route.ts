import { backendPost, badRequest, pickStrings, readJson, relay, withBackend } from "@/app/features/auth/server/backendClient";

/** POST /api/auth/login — body: { email, password } */
export async function POST(request: Request) {
  const body = pickStrings(await readJson(request), ["email", "password"] as const);
  if (!body) return badRequest("Email and password are required.");

  return withBackend(async () => relay(await backendPost("/login", body)));
}
