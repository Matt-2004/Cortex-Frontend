"use client";

import { useEffect, useRef } from "react";
import Button from "@/app/shared/ui/Button";
import Input from "@/app/shared/ui/Input";
import {
  AUTH_TITLE_ID,
  PasswordRequirements,
  authFormClassName,
  authPrimaryButtonClassName,
} from "@/app/features/auth/ui/AuthComponents";
import { PASSWORD_MAX_LENGTH } from "@/app/features/auth/utils/typeSchema";
import { useInvitedRegister } from "../hooks/useInvitedRegister";

/** Register's fields, with the email fixed by the invitation and no terms. */
export const InvitedRegisterForm = ({
  token,
  email,
  organizationName,
  onInvalid,
  onConflict,
}: {
  token: string;
  email: string;
  organizationName: string;
  onInvalid: (message: string) => void;
  onConflict: (message: string) => void;
}) => {
  const {
    formData,
    setFormData,
    validationErrors,
    showAllErrors,
    submitAttempt,
    isPending,
    handleFormSubmit,
  } = useInvitedRegister({ token, organizationName, onInvalid, onConflict });

  const firstNameRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    firstNameRef.current?.focus();
  }, []);

  return (
    // noValidate: we show our own accessible errors instead of browser bubbles
    <form
      onSubmit={handleFormSubmit}
      noValidate
      aria-labelledby={AUTH_TITLE_ID}
      aria-busy={isPending || undefined}
      className={authFormClassName}
    >
      {/* Read-only: the account is created for the invited address. It also
          gives password managers the username for the new password. */}
      <Input
        name="email"
        type="email"
        autoComplete="username"
        readOnly
        value={email}
        hint={
          <p className="text-xs text-brand-ink-subtle">
            Your invitation was sent to this address.
          </p>
        }
      >
        Email
      </Input>

      <div className="flex w-full flex-col gap-4 sm:flex-row">
        <div className="w-full flex-1">
          <Input
            ref={firstNameRef}
            name="firstName"
            type="text"
            required
            autoComplete="given-name"
            placeholder="Jane"
            value={formData.firstName}
            error={validationErrors?.firstName}
            forceShowError={showAllErrors}
            shakeSignal={submitAttempt}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, firstName: e.target.value }))
            }
          >
            First name
          </Input>
        </div>
        <div className="w-full flex-1">
          <Input
            name="lastName"
            type="text"
            required
            autoComplete="family-name"
            placeholder="Doe"
            value={formData.lastName}
            error={validationErrors?.lastName}
            forceShowError={showAllErrors}
            shakeSignal={submitAttempt}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, lastName: e.target.value }))
            }
          >
            Last name
          </Input>
        </div>
      </div>

      <Input
        name="password"
        type="password"
        required
        maxLength={PASSWORD_MAX_LENGTH}
        autoComplete="new-password"
        placeholder="Create a password"
        value={formData.password}
        error={
          validationErrors?.password
            ? "Your password doesn't meet all the requirements"
            : undefined
        }
        forceShowError={showAllErrors}
        shakeSignal={submitAttempt}
        hint={<PasswordRequirements password={formData.password} />}
        onChange={(e) =>
          // Never trim passwords: spaces are valid characters.
          setFormData((prev) => ({ ...prev, password: e.target.value }))
        }
      >
        Password
      </Input>

      <Input
        name="confirmPassword"
        type="password"
        required
        maxLength={PASSWORD_MAX_LENGTH}
        autoComplete="new-password"
        placeholder="Re-enter your password"
        value={formData.confirmPassword}
        error={validationErrors?.confirmPassword}
        forceShowError={showAllErrors}
        shakeSignal={submitAttempt}
        onChange={(e) =>
          setFormData((prev) => ({ ...prev, confirmPassword: e.target.value }))
        }
      >
        Confirm password
      </Input>

      <div className="mt-2 w-full">
        <Button
          type="submit"
          width="full"
          loading={isPending}
          className={authPrimaryButtonClassName}
        >
          Create account and join
        </Button>
      </div>
    </form>
  );
};
