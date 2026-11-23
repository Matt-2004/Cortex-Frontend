import { NextResponse, type NextRequest } from "next/server";
import { safeReturnTo, withReturnTo } from "@/app/shared/utils/returnTo";

const SIGN_IN_PATH = "/auth/login";
const PATH_AFTER_SIGN_IN = "/console";

/**
 * A routing hint only: a cookie can be stale or revoked, so its presence proves
 * nothing. `/api/auth/me` (in ConsoleShell) decides whether the session is real.
 * Either cookie counts because the access cookie expires long before the
 * refresh cookie, and the client can still renew the session from the latter.
 */
const mayHaveSession = (request: NextRequest) =>
  request.cookies.has("cortex_access_token") ||
  request.cookies.has("cortex_refresh_token");

export function proxy(request: NextRequest) {
  const { pathname, search, searchParams } = request.nextUrl;

  if (pathname === SIGN_IN_PATH) {
    // `session=ended`: the client just proved these cookies don't work.
    // Sending them back to the console would loop.
    if (!mayHaveSession(request) || searchParams.get("session") === "ended") {
      return NextResponse.next();
    }
    const destination =
      safeReturnTo(searchParams.get("returnTo")) ?? PATH_AFTER_SIGN_IN;
    return NextResponse.redirect(new URL(destination, request.url));
  }

  if (mayHaveSession(request)) return NextResponse.next();

  const returnTo = safeReturnTo(`${pathname}${search}`);
  const signIn = returnTo ? withReturnTo(SIGN_IN_PATH, returnTo) : SIGN_IN_PATH;
  return NextResponse.redirect(new URL(signIn, request.url));
}

/* Prefetches are skipped so a signed-out redirect is never stored in the
   client's route cache and replayed after login. They only return the static
   shell, and ConsoleShell shows none of it until the session check passes. */
export const config = {
  matcher: [
    {
      source: "/console/:path*",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
    {
      source: "/auth/login",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
