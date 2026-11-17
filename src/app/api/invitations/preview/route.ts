import type { NextRequest } from "next/server";
import {
  backendApiFetch,
  badRequest,
  relay,
  withBackend,
} from "@/app/features/auth/server/backendClient";

/** GET /api/invitations/preview?token=… — public: who invited whom, to what. */
export async function GET(request: NextRequest) {
  const token = (request.nextUrl.searchParams.get("token") ?? "").trim();
  if (!token) return badRequest("Invitation token is required.");

  return withBackend(async () =>
    relay(
      await backendApiFetch(
        `/invitations/preview?token=${encodeURIComponent(token)}`,
      ),
    ),
  );
}
