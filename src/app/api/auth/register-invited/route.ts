import {
  backendPost,
  badRequest,
  pickStrings,
  problem,
  readJson,
  relay,
  withBackend,
} from "@/app/features/auth/server/backendClient";

/**
 * POST /api/auth/register-invited — body: { token, name, password }.
 * Creates the invited account, joins the organization and signs in: the
 * backend sets the `cortex_access_token` and `cortex_refresh_token` cookies.
 *
 * Unlike relay(), a success response drops `accessToken` / `refreshToken`
 * from the JSON: the session lives in the HttpOnly cookies only, so the
 * browser never needs to see the tokens. Errors are relayed unchanged.
 */
export async function POST(request: Request) {
  const body = pickStrings(await readJson(request), [
    "token",
    "name",
    "password",
  ] as const);
  if (!body) return badRequest("Token, name and password are required.");

  return withBackend(async () => {
    const response = await backendPost("/register-invited", body);
    if (!response.ok) return relay(response);

    const session: unknown = await response.json().catch(() => null);
    if (!session || typeof session !== "object" || Array.isArray(session)) {
      console.error("[auth backend] register-invited: body is not JSON");
      return problem(
        502,
        "Something went wrong on the server. Please try again.",
      );
    }
    // The tokens are dropped: the session lives in the HttpOnly cookies.
    const { accessToken, refreshToken, ...rest } = session as Record<
      string,
      unknown
    >;

    // getSetCookie() returns each Set-Cookie header separately, so the comma
    // in "Expires=Thu, 21 Nov 2026 …" is never treated as a separator.
    const headers = new Headers({ "Cache-Control": "no-store" });
    for (const cookie of response.headers.getSetCookie())
      headers.append("Set-Cookie", cookie);

    return Response.json(rest, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  });
}
