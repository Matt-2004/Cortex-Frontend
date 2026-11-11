import { useRef, useState } from "react";
import { useToast } from "@/app/features/toast/hooks/useToast";
import { ResetPasswordSchema } from "@/app/features/auth/utils/typeSchema";
import { useAuthForm } from "@/app/shared/hooks/useAuthForm";
import { focusFirstInvalidField } from "@/app/shared/utils/focusFirstInvalid";
import { resetPasswordAction } from "../utils/resetPasswordAction";
import { ResetPasswordInputDTO } from "../../types/auth.types";
import { unexpectedErrorResponse } from "../../utils/submitHelpers";

const initialResetPasswordFormData = {
  newPassword: "",
  confirmedPassword: "",
};

/**
 * `URLSearchParams.get` turns "+" into " ", which corrupts base64 tokens.
 * Restore them and drop surrounding whitespace.
 */
export const normalizeResetToken = (token: string | null) =>
  token?.trim().replace(/\s+/g, "+") || null;

export const useResetPassword = (token: string | null) => {
  const [isPending, setIsPending] = useState(false);
  const [showAllErrors, setShowAllErrors] = useState(false);
  // Bumped on every failed submit so invalid fields shake again.
  const [submitAttempt, setSubmitAttempt] = useState(0);
  const isSubmittingRef = useRef(false);

  const { handleToast } = useToast({
    toastType: null,
    message: null,
  });

  const { formData, setFormData, validationErrors, isFormValid } =
    useAuthForm<ResetPasswordInputDTO>(
      initialResetPasswordFormData,
      ResetPasswordSchema,
    );

  const normalizedToken = normalizeResetToken(token);

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmittingRef.current) return;

    if (!normalizedToken) {
      handleToast(
        {
          isSuccess: false,
          message: "Reset token is missing or invalid.",
          data: null,
          status: 400,
        },
        "/auth/login",
      );
      return;
    }

    if (!isFormValid) {
      setShowAllErrors(true);
      setSubmitAttempt((n) => n + 1);
      focusFirstInvalidField(e.currentTarget);
      return;
    }

    const submitData = new FormData();
    submitData.append("newPassword", formData.newPassword);
    submitData.append("confirmedPassword", formData.confirmedPassword);
    submitData.append("token", normalizedToken);

    isSubmittingRef.current = true;
    setIsPending(true);
    let succeeded = false;
    try {
      const response = await resetPasswordAction(submitData);
      succeeded = response.isSuccess;
      handleToast(response, "/auth/login");
    } catch {
      handleToast(unexpectedErrorResponse());
    } finally {
      if (!succeeded) {
        isSubmittingRef.current = false;
        setIsPending(false);
      }
    }
  };

  return {
    isPending,
    handleFormSubmit,
    formData,
    setFormData,
    validationErrors,
    isFormValid,
    showAllErrors,
    submitAttempt,
    hasToken: Boolean(normalizedToken),
  };
};
