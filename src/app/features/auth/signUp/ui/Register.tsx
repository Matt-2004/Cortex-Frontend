"use client";

import { useEffect, useRef } from "react";
import Button from "@/app/shared/ui/Button";
import Input from "@/app/shared/ui/Input";
import {
  AUTH_TITLE_ID,
  AuthFooterText,
  AuthLink,
  AuthSplitLayout,
  authCheckboxClassName,
  authFormClassName,
  authPrimaryButtonClassName,
  PasswordRequirements,
} from "../../ui/AuthComponents";
import { PASSWORD_MAX_LENGTH } from "../../utils/typeSchema";
import { shakeElement } from "@/app/shared/ui/shake";
import { useSignUp } from "../hooks/useSignUp";

const Register = () => {
  const {
    formData,
    isPending,
    handleFormSubmit,
    setFormData,
    validationErrors,
    showAllErrors,
    submitAttempt,
  } = useSignUp();

  const termsError =
    showAllErrors && !formData.agreeToTerms
      ? "You must agree to the terms to create an account"
      : undefined;

  const firstNameRef = useRef<HTMLInputElement>(null);
  const termsRowRef = useRef<HTMLDivElement>(null);

  // Shake the terms checkbox on a failed submit if it isn't ticked.
  useEffect(() => {
    if (submitAttempt && !formData.agreeToTerms) {
      shakeElement(termsRowRef.current);
    }
    // Only re-run on a new submit attempt, not when the box is toggled.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitAttempt]);

  useEffect(() => {
    firstNameRef.current?.focus();
  }, []);

  return (
    <AuthSplitLayout
      eyebrow="Get started"
      headline="Add an AI assistant to your website."
      title="Create your account"
      subtitle="Create your account, then add your website and documents."
    >
      {/* noValidate: we show our own accessible errors instead of browser bubbles */}
      <form
        onSubmit={handleFormSubmit}
        noValidate
        aria-labelledby={AUTH_TITLE_ID}
        aria-busy={isPending || undefined}
        className={authFormClassName}
      >
        <div className="flex w-full flex-col gap-4 sm:flex-row">
          <div className="w-full flex-1">
            <Input
              data-testid="first-name"
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
                setFormData((prev) => ({
                  ...prev,
                  firstName: e.target.value,
                }))
              }
            >
              First name
            </Input>
          </div>
          <div className="w-full flex-1">
            <Input
              data-testid="last-name"
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
                setFormData((prev) => ({
                  ...prev,
                  lastName: e.target.value,
                }))
              }
            >
              Last name
            </Input>
          </div>
        </div>

        <Input
          data-testid="email"
          name="email"
          type="email"
          inputMode="email"
          required
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="you@company.com"
          value={formData.email}
          error={validationErrors?.email}
          forceShowError={showAllErrors}
          shakeSignal={submitAttempt}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              email: e.target.value,
            }))
          }
        >
          Work email
        </Input>

        <Input
          data-testid="password"
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
            setFormData((prev) => ({
              ...prev,
              // Never trim passwords: spaces are valid characters.
              password: e.target.value,
            }))
          }
        >
          Password
        </Input>

        <Input
          data-testid="confirm-password"
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
            setFormData((prev) => ({
              ...prev,
              confirmPassword: e.target.value,
            }))
          }
        >
          Confirm password
        </Input>

        <div className="mt-1 flex w-full flex-col gap-1.5">
          <div ref={termsRowRef} className="flex items-start gap-2">
            <input
              data-testid="agree-to-terms"
              required
              aria-invalid={termsError ? true : undefined}
              aria-describedby={termsError ? "policy-error" : undefined}
              name="agreeToTerms"
              id="policy"
              type="checkbox"
              checked={formData.agreeToTerms}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  agreeToTerms: e.target.checked,
                }))
              }
              className={`${authCheckboxClassName} mt-0.5 shrink-0`}
            />
            <label
              htmlFor="policy"
              className="cursor-pointer text-sm text-[#4B5468]"
            >
              I agree to the Terms of Service and Privacy Policy
            </label>
          </div>
          {termsError ? (
            <p
              id="policy-error"
              data-slot="error"
              className="text-xs font-medium text-red-500"
            >
              {termsError}
            </p>
          ) : null}
        </div>

        <div className="mt-2 w-full">
          <Button
            type="submit"
            width="full"
            loading={isPending}
            className={authPrimaryButtonClassName}
          >
            Create account
          </Button>
        </div>

        <AuthFooterText>
          Already have an account?{" "}
          <AuthLink href="/auth/login" direction="back">Sign in</AuthLink>
        </AuthFooterText>
      </form>
    </AuthSplitLayout>
  );
};

export default Register;
