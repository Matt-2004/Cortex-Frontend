import { BACKEND_API_URL } from "@/app/shared/utils/config";
import { MainResponse } from "@/app/shared/types.ts/main-response";

/* ────────────────────────────────────────────────────────────
 * TEMPORARY demo mode for auth, used until the backend URL is set.
 *
 * When `NEXT_Backend_URL` is empty, auth server actions don't call the
 * API. They wait MOCK_LATENCY_MS (so the loading UI is visible) and
 * return a successful demo response with `data: null`, so the sign-in
 * hooks skip the token/cookie step and simply redirect.
 *
 * To switch to the real API: set NEXT_Backend_URL in .env.local and
 * restart `next dev`. Nothing else needs to change.
 * ──────────────────────────────────────────────────────────── */

export const MOCK_LATENCY_MS = 2000;

export const isBackendConfigured = () =>
  typeof BACKEND_API_URL === "string" && BACKEND_API_URL.trim().length > 0;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function mockAuthResponse(
  message: string,
  status = 200,
): Promise<MainResponse<null>> {
  await wait(MOCK_LATENCY_MS);
  return {
    isSuccess: true,
    message,
    data: null,
    status,
  };
}
