import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/app/features/toast/hooks/useToast";
import { isAbortError, toApiError } from "@/app/shared/utils/errors/apiError";
import { authApi } from "../../api/authApi";
import { PATH_AFTER_SIGN_IN } from "../../signIn/hooks/useSignIn";
import type { AuthSession } from "../../types/auth-api.types";

export type VerifyEmailStatus = "verifying" | "verified" | "failed";

/**
 * Verification tokens are single-use. React (Strict Mode, remounts) can run
 * the effect twice, so share one request per token instead of sending two.
 */
const requests = new Map<string, Promise<AuthSession>>();

function verifyOnce(token: string): Promise<AuthSession> {
  let request = requests.get(token);
  if (!request) {
    request = authApi.verifyEmail(token);
    requests.set(token, request);
    // Allow a manual retry after a failure (e.g. network blip).
    request.catch(() => requests.delete(token));
  }
  return request;
}

/**
 * Opened from the emailed link (/verify-email?token=…).
 * 200 → signed in (cookies set) → redirect into the app.
 * 400 → invalid/expired token; the page offers to resend.
 */
export const useVerifyEmailToken = (token: string) => {
  const router = useRouter();
  const { addToastMessage } = useToast();
  const [status, setStatus] = useState<VerifyEmailStatus>("verifying");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    verifyOnce(token)
      .then(() => {
        if (!active) return;
        setStatus("verified");
        addToastMessage("success", "Email verified. You're signed in.");
        router.replace(PATH_AFTER_SIGN_IN);
      })
      .catch((error: unknown) => {
        if (!active || isAbortError(error)) return;
        setStatus("failed");
        setErrorMessage(toApiError(error).message);
      });

    return () => {
      active = false;
    };
  }, [token, router, addToastMessage]);

  return { status, errorMessage };
};
