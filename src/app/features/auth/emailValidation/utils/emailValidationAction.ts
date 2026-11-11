"use server";

import { isBackendConfigured, mockAuthResponse } from "../../utils/mockBackend";
import { ErrorResponse } from "@/app/shared/utils/errors/errorResponse";
import { EmailValidationResponse } from "../types/email-validation-response";
import { EmailValidationVariant } from "../types/email-validation-request";
import { postFetch } from "@/app/shared/utils/API/AxiosClient";

/**
 * Sends either a password-reset link or a new verification link.
 * The variant is read from the form data (defaults to "reset-password").
 */
export async function emailValidationAction(
  formData: FormData,
): Promise<EmailValidationResponse> {
  const email = String(formData.get("email") ?? "").trim();
  const variant: EmailValidationVariant =
    formData.get("variant") === "verification"
      ? "verification"
      : "reset-password";

  if (!email) {
    return {
      isSuccess: false,
      message: "Enter a valid email address.",
      data: null,
      status: 400,
    };
  }

  // TEMPORARY: no backend URL yet → simulate a 2s email send.
  if (!isBackendConfigured()) {
    return mockAuthResponse(
      variant === "verification"
        ? "Verification email sent (demo mode: no backend connected yet)."
        : "Reset link sent (demo mode: no backend connected yet).",
    );
  }

  const encodedEmail = encodeURIComponent(email);

  try {
    const response =
      variant === "verification"
        ? await postFetch<null>(
            `/api/v1/auth/resend-verification-email?email=${encodedEmail}`,
            null,
          )
        : await postFetch<null>(
            `/api/v1/auth/send-password-reset-token?email=${encodedEmail}`,
            { email },
          );

    return response;
  } catch (error: unknown) {
    const err = error as ErrorResponse;
    return {
      isSuccess: false,
      message:
        err?.message ||
        (variant === "verification"
          ? "We couldn't send the verification email. Please try again."
          : "We couldn't send the reset link. Please try again."),
      data: null,
      status: err?.status || 500,
    };
  }
}
