"use server";

import { isBackendConfigured, mockAuthResponse } from "../../utils/mockBackend";
import { ErrorResponse } from "@/app/shared/utils/errors/errorResponse";
import { ResetPasswordResponse } from "../types/reset-password-response";
import { postFetch } from "@/app/shared/utils/API/AxiosClient";

export async function resetPasswordAction(
  formData: FormData,
): Promise<ResetPasswordResponse> {
  const newPassword = formData.get("newPassword") as string;
  const confirmedPassword = formData.get("confirmedPassword") as string;
  const token = String(formData.get("token") ?? "");

  // TEMPORARY: no backend URL yet → simulate a 2s password update.
  if (!isBackendConfigured()) {
    return mockAuthResponse(
      "Password updated (demo mode: no backend connected yet).",
    );
  }

  try {
    const response = await postFetch<null>(
      `/api/v1/auth/reset-password?token=${encodeURIComponent(token ?? "")}`,
      {
        newPassword,
        confirmedPassword,
      },
    );

    return response;
  } catch (error: unknown) {
    const err = error as ErrorResponse;
    return {
      isSuccess: false,
      message: err?.message || "We couldn't update your password. Please try again.",
      data: null,
      status: err?.status || 500,
    };
  }
}

export type ResetPasswordAction = typeof resetPasswordAction;
