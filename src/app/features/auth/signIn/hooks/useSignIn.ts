import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LoginSchema } from "../../utils/typeSchema";
import { useAuthForm } from "../../../../shared/hooks/useAuthForm";
import { useToast } from "@/app/features/toast/hooks/useToast";
import { useApiErrorHandler } from "@/app/shared/hooks/useApiErrorHandler";
import { focusFirstInvalidField } from "@/app/shared/utils/focusFirstInvalid";
import { returnToFromLocation } from "@/app/shared/utils/returnTo";
import { authApi } from "../../api/authApi";
import type { LoginRequest } from "../../types/auth-api.types";

// formData --> handleFormSubmit() --> authApi.login (sets session cookies) --> redirect

export const PATH_AFTER_SIGN_IN = "/console";

const initialLoginFormData: LoginRequest = {
  email: "",
  password: "",
};

export const useSignIn = () => {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [showAllErrors, setShowAllErrors] = useState(false);
  // Bumped on every failed submit so invalid fields shake again.
  const [submitAttempt, setSubmitAttempt] = useState(0);
  const isSubmittingRef = useRef(false);

  // Set when login returns 403 (email not verified): shows the resend action.
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  // The backend's 403 message, shown as-is in the banner.
  const [unverifiedMessage, setUnverifiedMessage] = useState<string | null>(
    null,
  );
  const [isResending, setIsResending] = useState(false);

  const { addToastMessage } = useToast();
  const handleApiError = useApiErrorHandler();

  // Login only checks that fields are filled in — never password rules.
  const {
    formData,
    setFormData,
    validationErrors,
    isFormValid,
    setServerErrors,
  } = useAuthForm(initialLoginFormData, LoginSchema);

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmittingRef.current) return;

    if (isFormValid === false) {
      setShowAllErrors(true);
      setSubmitAttempt((n) => n + 1);
      focusFirstInvalidField(e.currentTarget);
      return;
    }

    const email = formData.email.trim();
    isSubmittingRef.current = true;
    setIsPending(true);
    setUnverifiedEmail(null);
    let succeeded = false;
    try {
      // Send the password exactly as typed (spaces are valid characters).
      await authApi.login({ email, password: formData.password });
      succeeded = true;
      addToastMessage("success", "Signed in.");
      // e.g. back to an invitation; a missing or unsafe ?returnTo= is ignored.
      router.push(returnToFromLocation() ?? PATH_AFTER_SIGN_IN);
    } catch (error) {
      handleApiError(error, {
        onFieldErrors: (errors) => {
          setServerErrors(errors);
          setShowAllErrors(true);
        },
        onStatus: {
          403: (apiError) => {
            setUnverifiedEmail(email);
            setUnverifiedMessage(apiError.message);
            return true; // shown inline, with a resend action
          },
        },
      });
    } finally {
      // On success keep the button locked until the redirect happens.
      if (!succeeded) {
        isSubmittingRef.current = false;
        setIsPending(false);
      }
    }
  };

  const resendVerification = async () => {
    if (!unverifiedEmail || isResending) return;
    setIsResending(true);
    try {
      await authApi.resendVerification({ email: unverifiedEmail });
      addToastMessage(
        "success",
        "Verification email sent. Check your inbox for the link.",
      );
    } catch (error) {
      handleApiError(error, {
        onStatus: {
          409: (apiError) => {
            // Already verified: they can just sign in.
            setUnverifiedEmail(null);
            addToastMessage("info", apiError.message);
            return true;
          },
        },
      });
    } finally {
      setIsResending(false);
    }
  };

  return {
    isPending,
    handleFormSubmit,
    formData,
    setFormData,
    validationErrors,
    showAllErrors,
    submitAttempt,
    unverifiedEmail,
    unverifiedMessage,
    isResending,
    resendVerification,
  };
};
