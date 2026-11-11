import { backendPost, badRequest, pickStrings, readJson, relay, withBackend } from "@/app/features/auth/server/backendClient";

/** POST /api/auth/register — body: { name, email, password } */
export async function POST(request: Request) {
  const body = pickStrings(await readJson(request), ["name", "email", "password"] as const);
  if (!body) return badRequest("Name, email and password are required.");

  return withBackend(async () => relay(await backendPost("/register", body)));
}
