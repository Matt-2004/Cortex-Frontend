import { apiRequest, refreshSession } from "@/app/shared/utils/API/apiClient";
import type {
  AuthSession,
  GoogleSessionRequest,
  LoginRequest,
  RegisterRequest,
  ResendVerificationRequest,
  User,
} from "../types/auth-api.types";

const NEXTAUTH_CLEANUP_TIMEOUT_MS = 2000;

/**
 * Drops the NextAuth cookie, which still holds the Google ID token. Best
 * effort: the Cortex session has already ended, so a failed or hung cleanup
 * must not keep the user from leaving. The explicit callbackUrl stops NextAuth
 * from posting the current URL, which may carry an invitation token.
 */
async function clearNextAuthSession(): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      import("next-auth/react").then(({ signOut }) =>
        signOut({ redirect: false, callbackUrl: "/auth/login" }),
      ),
      new Promise((resolve) => {
        timer = setTimeout(resolve, NEXTAUTH_CLEANUP_TIMEOUT_MS);
      }),
    ]);
  } catch {
    // See above: nothing more to do.
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Browser client for the Cortex auth API, via our /api/auth/* proxies.
 * Every method throws `ApiError` on failure; pass it to useApiErrorHandler.
 * Endpoints that return an AuthSession also set the HttpOnly session cookies.
 */
export const authApi = {
  /** 201 → unverified User. Does NOT sign in. 400 | 409 */
  register: (body: RegisterRequest) =>
    apiRequest<User>("/api/auth/register", { body }),

  /** 200 → AuthSession. 400 | 401 bad credentials | 403 email not verified */
  login: (body: LoginRequest) =>
    apiRequest<AuthSession>("/api/auth/login", { body }),

  /** 200 → AuthSession. 400 | 401 invalid/expired Google token */
  googleSession: (body: GoogleSessionRequest) =>
    apiRequest<AuthSession>("/api/auth/google-session", { body }),

  /** 200 → AuthSession (signed in). 400 invalid/expired token */
  verifyEmail: (token: string) =>
    apiRequest<AuthSession>(
      `/api/auth/verify-email?token=${encodeURIComponent(token)}`,
    ),

  /** 204. 400 | 404 unknown email | 409 already verified */
  resendVerification: (body: ResendVerificationRequest) =>
    apiRequest<void>("/api/auth/resend-verification", { body }),

  /** Shared, deduplicated refresh. 401 → throws "Invalid or expired refresh token." */
  refresh: refreshSession,

  /** 204 always; revokes the session and clears the cookies, NextAuth's too. */
  logout: async () => {
    await apiRequest<void>("/api/auth/logout", { method: "POST" });
    await clearNextAuthSession();
  },

  /** 200 → User. Refreshes once on 401; then throws `sessionExpired`. */
  me: (signal?: AbortSignal) =>
    apiRequest<User>("/api/auth/me", { auth: true, signal }),
};
