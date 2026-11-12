import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/app/features/toast/hooks/useToast";
import { sendEmailSchema } from "@/app/features/auth/utils/typeSchema";
import { useAuthForm } from "@/app/shared/hooks/useAuthForm";
import { useApiErrorHandler } from "@/app/shared/hooks/useApiErrorHandler";
import { focusFirstInvalidField } from "@/app/shared/utils/focusFirstInvalid";
import { emailValidationAction } from "../utils/emailValidationAction";
import { EmailValidationVariant } from "../types/email-validation-request";
import { unexpectedErrorResponse } from "../../utils/submitHelpers";
import { authApi } from "../../api/authApi";

export const useEmailValidation = (
  variant: EmailValidationVariant = "reset-password",
  initialEmail = "",
) => {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [showAllErrors, setShowAllErrors] = useState(false);
  // Bumped on every failed submit so invalid fields shake again.
  const [submitAttempt, setSubmitAttempt] = useState(0);
  const isSubmittingRef = useRef(false);
  // Verification only: the address a link was last sent to.
  const [sentTo, setSentTo] = useState<string | null>(null);

  const { handleToast, addToastMessage } = useToast();
  const handleApiError = useApiErrorHandler();

  const {
    formData,
    setFormData,
    validationErrors,
    isFormValid,
    setServerErrors,
  } = useAuthForm({ email: initialEmail }, sendEmailSchema);

  /** POST /api/auth/resend-verification — 204 | 400 | 404 | 409 */
  const resendVerification = async (email: string) => {
    try {
      await authApi.resendVerification({ email });
      setSentTo(email);
      addToastMessage("success", "Verification email sent. Check your inbox.");
    } catch (error) {
      handleApiError(error, {
        onFieldErrors: (errors) => {
          setServerErrors(errors);
          setShowAllErrors(true);
        },
        onStatus: {
          404: (apiError) => {
            setServerErrors({ email: apiError.message });
            setShowAllErrors(true);
            setSubmitAttempt((n) => n + 1);
            return true;
          },
          409: (apiError) => {
            // Already verified → send them to sign in.
            addToastMessage("info", apiError.message);
            router.push("/auth/login");
            return true;
          },
        },
      });
    }
  };

  /** Password reset still uses the older auth server action. */
  const sendResetLink = async (email: string) => {
    const submitData = new FormData();
    submitData.append("email", email);
    submitData.append("variant", "reset-password");
    try {
      const response = await emailValidationAction(submitData);
      handleToast(response, response.isSuccess ? "/auth/login" : undefined);
      return response.isSuccess;
    } catch {
      handleToast(unexpectedErrorResponse());
      return false;
    }
  };

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmittingRef.current) return;

    if (!isFormValid) {
      setShowAllErrors(true);
      setSubmitAttempt((n) => n + 1);
      focusFirstInvalidField(e.currentTarget);
      return;
    }

    const email = formData.email.trim();
    isSubmittingRef.current = true;
    setIsPending(true);
    let lockUntilRedirect = false;
    try {
      if (variant === "verification") {
        await resendVerification(email);
      } else {
        // On success keep the button locked until the redirect happens.
        lockUntilRedirect = await sendResetLink(email);
      }
    } finally {
      if (!lockUntilRedirect) {
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
    sentTo,
  };
};
