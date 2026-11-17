import {
  backendApiFetch,
  relay,
  withBackend,
} from "@/app/features/auth/server/backendClient";

/**
 * GET /api/plans — the plan catalog, in display order. Public on the
 * backend, so no session is forwarded.
 */
export async function GET() {
  return withBackend(async () => relay(await backendApiFetch("/plans")));
}
