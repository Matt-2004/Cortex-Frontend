import { apiRequest, refreshSession } from "@/app/shared/utils/API/apiClient";
import type {
  AuthSession,
  GoogleSessionRequest,
  LoginRequest,
  RegisterRequest,
  ResendVerificationRequest,
  User,
} from "../types/auth-api.types";

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

  /** 204 always; revokes the session and clears the cookies. */
  logout: () => apiRequest<void>("/api/auth/logout", { method: "POST" }),

  /** 200 → User. Refreshes once on 401; then throws `sessionExpired`. */
  me: (signal?: AbortSignal) =>
    apiRequest<User>("/api/auth/me", { auth: true, signal }),
};
