"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import z from "zod";
import { useAuthForm } from "@/app/shared/hooks/useAuthForm";
import { useToast } from "@/app/features/toast/hooks/useToast";
import { useApiErrorHandler } from "@/app/shared/hooks/useApiErrorHandler";
import { focusFirstInvalidField } from "@/app/shared/utils/focusFirstInvalid";
import { AUTH_LIMITS } from "@/app/features/auth/types/auth-api.types";
import {
  PASSWORD_MAX_LENGTH,
  passwordRules,
  toFullName,
} from "@/app/features/auth/utils/typeSchema";
import { invitationsApi } from "../api/invitationsApi";
import { PATH_AFTER_JOINING } from "../types/invitation.types";

// formData --> register-invited (sets session cookies, joins) --> organizations

/**
 * Register's fields minus email (fixed by the invitation) and terms. Same
 * password rules, built from the shared `passwordRules`.
 */
const InvitedRegisterSchema = z
  .object({
    firstName: z.string().trim().min(1, "Enter your first name"),
    lastName: z.string().trim().min(1, "Enter your last name"),
    password: passwordRules
      .reduce(
        (schema, rule) => schema.refine(rule.test, { message: rule.message }),
        z.string(),
      )
      .refine((value) => value.length <= PASSWORD_MAX_LENGTH, {
        message: `Password must be ${PASSWORD_MAX_LENGTH} characters or fewer`,
      }),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
    when: (payload) =>
      typeof (payload.value as { confirmPassword?: unknown })
        ?.confirmPassword === "string",
  })
  .refine(
    (data) =>
      toFullName(data.firstName, data.lastName).length <= AUTH_LIMITS.nameMax,
    {
      message: `First and last name together must be ${AUTH_LIMITS.nameMax} characters or fewer`,
      path: ["lastName"],
      when: (payload) => {
        const v = payload.value as { firstName?: unknown; lastName?: unknown };
        return (
          typeof v?.firstName === "string" && typeof v?.lastName === "string"
        );
      },
    },
  );

const initialFormData = {
  firstName: "",
  lastName: "",
  password: "",
  confirmPassword: "",
};

/** Fields the form shows; other 400 field errors (e.g. token) mean a bad link. */
const FORM_FIELDS = new Set(["name", "password"]);

export const useInvitedRegister = ({
  token,
  organizationName,
  onInvalid,
  onConflict,
}: {
  token: string;
  organizationName: string;
  /** The invitation stopped working (400 without form field errors). */
  onInvalid: (message: string) => void;
  /** 409: the email can't be registered; offer sign-in instead. */
  onConflict: (message: string) => void;
}) => {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [showAllErrors, setShowAllErrors] = useState(false);
  // Bumped on every failed submit so invalid fields shake again.
  const [submitAttempt, setSubmitAttempt] = useState(0);
  const isSubmittingRef = useRef(false);

  const { addToastMessage } = useToast();
  const handleApiError = useApiErrorHandler();
  const {
    formData,
    setFormData,
    validationErrors,
    isFormValid,
    setServerErrors,
  } = useAuthForm(initialFormData, InvitedRegisterSchema);

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmittingRef.current) return;

    if (!isFormValid) {
      setShowAllErrors(true);
      setSubmitAttempt((n) => n + 1);
      focusFirstInvalidField(e.currentTarget);
      return;
    }

    isSubmittingRef.current = true;
    setIsPending(true);
    let succeeded = false;
    try {
      await invitationsApi.registerInvited({
        token,
        name: toFullName(formData.firstName, formData.lastName),
        // Sent exactly as typed (spaces are valid characters).
        password: formData.password,
      });
      succeeded = true;
      addToastMessage(
        "success",
        `Account created. You joined ${organizationName}.`,
      );
      router.replace(PATH_AFTER_JOINING);
    } catch (error) {
      handleApiError(error, {
        // The API takes one `name`; show its errors under "First name".
        fieldMap: { name: "firstName" },
        onFieldErrors: (errors) => {
          setServerErrors(errors);
          setShowAllErrors(true);
        },
        onStatus: {
          400: (apiError) => {
            const fields = Object.keys(apiError.fieldErrors);
            if (fields.some((field) => FORM_FIELDS.has(field))) return false;
            onInvalid(apiError.message);
            return true;
          },
          409: (apiError) => {
            onConflict(apiError.message);
            return true;
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

  return {
    formData,
    setFormData,
    validationErrors,
    showAllErrors,
    submitAttempt,
    isPending,
    handleFormSubmit,
  };
};
