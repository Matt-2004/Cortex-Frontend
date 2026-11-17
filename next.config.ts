import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */

  // Old auth URLs → clearer ones. Kept so links in emails that were already
  // sent keep working. Query strings (e.g. ?token=…) are passed through.
  async redirects() {
    return [
      {
        source: "/auth/email/reset-password",
        destination: "/auth/forgot-password",
        permanent: true,
      },
      {
        source: "/auth/password/reset",
        destination: "/auth/reset-password",
        permanent: true,
      },
      {
        source: "/auth/email/verification",
        destination: "/auth/verify-email",
        permanent: true,
      },
      // The backend's verification email links to {FRONTEND_BASE_URL}/verify-email?token=…
      {
        source: "/verify-email",
        destination: "/auth/verify-email",
        permanent: false,
      },
      // Stripe returns to the backend's {FRONTEND_BASE_URL}/organizations/{id}/billing
      // (?checkout=success|cancelled after Checkout, nothing after the portal).
      {
        source: "/organizations/:organizationId/billing",
        destination: "/console/organizations/:organizationId?tab=billing",
        permanent: false,
      },
    ];
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
