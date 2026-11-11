"use client";

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
  PasswordRequirements,
} from "@/app/features/auth/ui/AuthComponents";
import { PASSWORD_MAX_LENGTH } from "@/app/features/auth/utils/typeSchema";
import { useSearchParams } from "next/navigation";
import { useResetPassword } from "../hooks/useResetPassword";

const ResetPassword = () => {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const {
    isPending,
    handleFormSubmit,
    formData,
    setFormData,
    validationErrors,
    showAllErrors,
    submitAttempt,
    hasToken = true,
  } = useResetPassword(token);

  return (
    <AuthSplitLayout
      eyebrow="Account security"
      headline="Choose a strong new password."
      title="Set a new password"
      subtitle="Your new password must be different from your previous one."
    >
      {!hasToken ? (
        <div className="flex flex-col gap-4">
          <AuthAlert title="This reset link is invalid or incomplete">
            Open the link from your email again, or request a new one.
          </AuthAlert>
          <AuthFooterText>
            <AuthLink href="/auth/forgot-password" direction="forward">
              Request a new reset link
            </AuthLink>
          </AuthFooterText>
        </div>
      ) : (
        /* noValidate: we show our own accessible errors instead of browser bubbles */
        <form
          onSubmit={handleFormSubmit}
          noValidate
          aria-labelledby={AUTH_TITLE_ID}
          aria-busy={isPending || undefined}
          className={authFormClassName}
        >
          <Input
            id="newPassword"
            name="newPassword"
            data-testid="new-password"
            required
            maxLength={PASSWORD_MAX_LENGTH}
            autoComplete="new-password"
            type="password"
            placeholder="Create a new password"
            value={formData.newPassword}
            error={
              validationErrors?.newPassword
                ? "Your password doesn't meet all the requirements"
                : undefined
            }
            forceShowError={showAllErrors}
            shakeSignal={submitAttempt}
            hint={<PasswordRequirements password={formData.newPassword} />}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                // Never trim passwords: spaces are valid characters.
                newPassword: e.target.value,
              }))
            }
          >
            New password
          </Input>

          <Input
            id="confirmedPassword"
            data-testid="confirm-password"
            name="confirmedPassword"
            required
            maxLength={PASSWORD_MAX_LENGTH}
            autoComplete="new-password"
            type="password"
            placeholder="Re-enter your new password"
            value={formData.confirmedPassword}
            error={validationErrors?.confirmedPassword}
            forceShowError={showAllErrors}
            shakeSignal={submitAttempt}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                confirmedPassword: e.target.value,
              }))
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
              Update password
            </Button>
          </div>

          <AuthFooterText>
            Remembered it?{" "}
            <AuthLink href="/auth/login" direction="back">Back to sign in</AuthLink>
          </AuthFooterText>
        </form>
      )}
    </AuthSplitLayout>
  );
};

export default ResetPassword;
