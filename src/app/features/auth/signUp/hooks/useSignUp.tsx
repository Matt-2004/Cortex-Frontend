import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { RegisterSchema, toFullName } from "../../utils/typeSchema";
import { useAuthForm } from "../../../../shared/hooks/useAuthForm";
import { useToast } from "@/app/features/toast/hooks/useToast";
import { useApiErrorHandler } from "@/app/shared/hooks/useApiErrorHandler";
import { focusFirstInvalidField } from "@/app/shared/utils/focusFirstInvalid";
import { authApi } from "../../api/authApi";

// formData --> handleFormSubmit() --> authApi.register --> "check your inbox"

const initialRegisterFormData = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  confirmPassword: "",
  agreeToTerms: false,
};

/** "Check your inbox" screen for a just-registered email. */
export const checkInboxPath = (email: string) =>
  `/auth/verify-email?sent=1&email=${encodeURIComponent(email)}`;

export const useSignUp = () => {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [showAllErrors, setShowAllErrors] = useState(false);
  // Bumped on every failed submit so invalid fields shake again.
  const [submitAttempt, setSubmitAttempt] = useState(0);
  const isSubmittingRef = useRef(false);

  const { addToastMessage } = useToast();
  const handleApiError = useApiErrorHandler();
  const { formData, setFormData, validationErrors, isFormValid, setServerErrors } =
    useAuthForm(initialRegisterFormData, RegisterSchema);

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmittingRef.current) return;

    if (!isFormValid) {
      setShowAllErrors(true);
      setSubmitAttempt((n) => n + 1);
      focusFirstInvalidField(e.currentTarget);
      return;
    }

    // Trim text fields on submit (not on every keystroke, so people can
    // type names with spaces). Passwords are sent exactly as typed.
    const email = formData.email.trim();

    isSubmittingRef.current = true;
    setIsPending(true);
    let succeeded = false;
    try {
      // 201 → unverified user. This does NOT sign them in.
      await authApi.register({
        name: toFullName(formData.firstName, formData.lastName),
        email,
        password: formData.password,
      });
      succeeded = true;
      addToastMessage("success", "Account created. Check your inbox to verify your email.");
      router.push(checkInboxPath(email));
    } catch (error) {
      handleApiError(error, {
        // The API takes one `name`; show its errors under "First name".
        fieldMap: { name: "firstName" },
        onFieldErrors: (errors) => {
          setServerErrors(errors);
          setShowAllErrors(true);
          setSubmitAttempt((n) => n + 1);
        },
        onStatus: {
          409: (apiError) => {
            // "This email is already registered." — show it on the field.
            setServerErrors({ email: apiError.message });
            setShowAllErrors(true);
            setSubmitAttempt((n) => n + 1);
            return true;
          },
        },
      });
    } finally {
      // On success keep the button locked until the redirect happens,
      // so the account can't be submitted twice.
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
  };
};
