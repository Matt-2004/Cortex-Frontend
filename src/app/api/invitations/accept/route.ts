import {
  backendApiFetch,
  badRequest,
  forwardCredentials,
  readJson,
  relay,
  withBackend,
} from "@/app/features/auth/server/backendClient";

/** POST /api/invitations/accept — body: { token }. Needs a signed-in user. */
export async function POST(request: Request) {
  return withBackend(async () => {
    const json = await readJson(request);
    if (!json) return badRequest("A JSON body is required.");
    const headers = forwardCredentials(request);
    headers.set("Content-Type", "application/json");
    return relay(
      await backendApiFetch("/invitations/accept", {
        method: "POST",
        headers,
        body: JSON.stringify(json),
      }),
    );
  });
}
