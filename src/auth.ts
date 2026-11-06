import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.provider = account.provider;
        token.providerAccountId = account.providerAccountId;
        token.tokenType = account.token_type;
        token.scope = account.scope;
        token.expiresAt = account.expires_at;
        token.hasAccessToken = Boolean(account.access_token);
        token.hasRefreshToken = Boolean(account.refresh_token);
        token.hasIdToken = Boolean(account.id_token);
      }

      return token;
    },
    async session({ session, token }) {
      session.authSummary = {
        provider: token.provider,
        type: "oidc",
        providerAccountId: token.providerAccountId,
        tokenType: token.tokenType,
        scope: token.scope,
        expiresAt: token.expiresAt,
        hasAccessToken: token.hasAccessToken,
        hasRefreshToken: token.hasRefreshToken,
        hasIdToken: token.hasIdToken,
      };

      return session;
    },
  },
};
