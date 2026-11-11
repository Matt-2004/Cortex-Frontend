/**
 * Shapes of the Cortex auth API (`/api/auth/*`).
 * JSON is camelCase; dates are ISO 8601 strings in UTC.
 */

export interface User {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  avatarUrl: string | null;
}

/** Returned by every endpoint that signs the user in. */
export interface AuthSession {
  /**
   * @deprecated Present for integration testing only and will be removed.
   * The session lives in the HttpOnly `cortex_access_token` cookie.
   */
  accessToken?: string;
  accessTokenExpiresAt: string;
  /**
   * @deprecated Present for integration testing only and will be removed.
   * The session lives in the HttpOnly `cortex_refresh_token` cookie.
   */
  refreshToken?: string;
  refreshTokenExpiresAt: string;
  user: User;
}

// ─── Requests ────────────────────────────────────────────────────────

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface GoogleSessionRequest {
  /** Google ID token (NextAuth `account.id_token`). */
  idToken: string;
}

export interface ResendVerificationRequest {
  email: string;
}

/** Body is optional: the API reads the `cortex_refresh_token` cookie. */
export interface RefreshRequest {
  refreshToken?: string;
}

/** Body is optional: the API reads the `cortex_refresh_token` cookie. */
export interface LogoutRequest {
  refreshToken?: string;
}

/** Server-side validation limits, mirrored for client-side checks. */
export const AUTH_LIMITS = {
  nameMax: 100,
  emailMax: 254,
  passwordMin: 8,
  passwordMax: 128,
} as const;
