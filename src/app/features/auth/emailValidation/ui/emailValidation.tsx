"use client";

import type { ReactNode } from "react";
import Button from "@/app/shared/ui/Button";
import Input from "@/app/shared/ui/Input";
import {
  AUTH_TITLE_ID,
  AuthAlert,
  AuthFooterText,
  AuthLink,
  AuthSplitLayout,
  authFormClassName,
  authPrimaryButtonClassName,
} from "@/app/features/auth/ui/AuthComponents";
import { useEmailValidation } from "../hooks/useEmailValidation";
import { EmailValidationVariant } from "../types/email-validation-request";

const textByVariant: Record<
  EmailValidationVariant,
  {
    eyebrow: string;
    headline: string;
    title: string;
    button: string;
    description: string;
  }
> = {
  verification: {
    eyebrow: "One more step",
    headline: "Verify your email address.",
    title: "Verify your email",
    button: "Send verification email",
    description: "Enter your email and we'll send you a verification link.",
  },
  "reset-password": {
    eyebrow: "Account recovery",
    headline: "Get back into your account.",
    title: "Reset your password",
    button: "Send reset link",
    description:
      "Enter the email address for your account and we'll send you a reset link.",
  },
};

const EmailValidation = ({
  variant,
  initialEmail = "",
  notice,
}: {
  variant: EmailValidationVariant;
  initialEmail?: string;
  /** Banner shown above the form (e.g. "check your inbox"). */
  notice?: ReactNode;
}) => {
  const {
    isPending,
    handleFormSubmit,
    formData,
    setFormData,
    validationErrors,
    showAllErrors,
    submitAttempt,
    sentTo,
  } = useEmailValidation(variant, initialEmail);

  const content = textByVariant[variant];

  return (
    <AuthSplitLayout
      eyebrow={content.eyebrow}
      headline={content.headline}
      title={content.title}
      subtitle={content.description}
    >
      {/* noValidate: we show our own accessible errors instead of browser bubbles */}
      <form
        onSubmit={handleFormSubmit}
        noValidate
        aria-labelledby={AUTH_TITLE_ID}
        aria-describedby={`${AUTH_TITLE_ID}-description`}
        aria-busy={isPending || undefined}
        className={authFormClassName}
      >
        {sentTo ? (
          <AuthAlert tone="info" title="Verification email sent">
            We sent a new link to <strong>{sentTo}</strong>. It can take a
            minute to arrive.
          </AuthAlert>
        ) : (
          notice
        )}

        <Input
          id="email"
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
          Email
        </Input>

        <div className="mt-2 w-full">
          <Button
            type="submit"
            width="full"
            loading={isPending}
            className={authPrimaryButtonClassName}
          >
            {content.button}
          </Button>
        </div>

        <AuthFooterText>
          Remember your password?{" "}
          <AuthLink href="/auth/login" direction="back">
            Back to sign in
          </AuthLink>
        </AuthFooterText>
      </form>
    </AuthSplitLayout>
  );
};

export default EmailValidation;
