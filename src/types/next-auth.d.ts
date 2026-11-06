import "next-auth";

declare module "next-auth" {
  interface Session {
    authSummary?: {
      provider?: string;
      type: "oidc";
      providerAccountId?: string;
      tokenType?: string;
      scope?: string;
      expiresAt?: number;
      hasAccessToken?: boolean;
      hasRefreshToken?: boolean;
      hasIdToken?: boolean;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    provider?: string;
    providerAccountId?: string;
    tokenType?: string;
    scope?: string;
    expiresAt?: number;
    hasAccessToken?: boolean;
    hasRefreshToken?: boolean;
    hasIdToken?: boolean;
  }
}
