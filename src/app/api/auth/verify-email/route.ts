import type { NextRequest } from "next/server";

import { backendFetch, badRequest, relay, withBackend } from "@/app/features/auth/server/backendClient";

/** GET /api/auth/verify-email?token=… (also accepts ?Token=…, the backend's name) */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const token = (params.get("token") ?? params.get("Token") ?? "").trim();
  if (!token) return badRequest("Verification token is required.");

  return withBackend(async () => relay(await backendFetch(`/verify-email?Token=${encodeURIComponent(token)}`)));
}
