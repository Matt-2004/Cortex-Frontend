"use client";

import { useEffect, useRef } from "react";
import Button from "@/app/shared/ui/Button";
import Input from "@/app/shared/ui/Input";
import {
  AUTH_TITLE_ID,
  AuthAlert,
  AuthDivider,
  AuthFooterText,
  AuthLink,
  AuthSplitLayout,
  authFormClassName,
  authPrimaryButtonClassName,
} from "../../ui/AuthComponents";
import { useSignIn } from "../hooks/useSignIn";
import { GoogleSignInButton } from "../../ui/GoogleSignInButton";

const Login = () => {
  const {
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
  } = useSignIn();

  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  return (
    <AuthSplitLayout
      eyebrow="Welcome back"
      headline="Your website's AI assistant, grounded in your content."
      title="Sign in to Cortex"
      subtitle="Sign in to your Cortex dashboard."
    >
      <div className="flex w-full flex-col gap-4">
        {/* noValidate: we show our own accessible errors instead of browser bubbles */}
        <form
          onSubmit={handleFormSubmit}
          noValidate
          aria-labelledby={AUTH_TITLE_ID}
          aria-busy={isPending || undefined}
          className={authFormClassName}
        >
          {unverifiedEmail ? (
            <AuthAlert title={unverifiedMessage ?? ""}>
              <p>
                Need a new link for <strong>{unverifiedEmail}</strong>?
              </p>
              <button
                type="button"
                onClick={resendVerification}
                disabled={isResending}
                aria-busy={isResending || undefined}
                className="mt-2 font-medium text-primary-700 underline decoration-current/30 underline-offset-4 hover:decoration-current disabled:cursor-wait disabled:opacity-70"
              >
                {isResending ? "Sending…" : "Resend verification email"}
              </button>
            </AuthAlert>
          ) : null}

          <Input
            id="email"
            ref={emailRef}
            name="email"
            autoComplete="email"
            inputMode="email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            required
            type="email"
            placeholder="you@company.com"
            value={formData.email}
            error={validationErrors?.email}
            forceShowError={showAllErrors}
            shakeSignal={submitAttempt}
            data-testid="email"
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                email: e.target.value,
              }))
            }
          >
            Email
          </Input>

          <Input
            id="password"
            name="password"
            autoComplete="current-password"
            required
            type="password"
            placeholder="Enter your password"
            value={formData.password}
            error={validationErrors?.password}
            forceShowError={showAllErrors}
            shakeSignal={submitAttempt}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                password: e.target.value,
              }))
            }
            data-testid="password"
          >
            Password
          </Input>

          <div className="flex w-full flex-wrap items-center justify-end gap-2 text-sm">
            <AuthLink href="/auth/forgot-password" direction="forward">
              Forgot password?
            </AuthLink>
          </div>

          <div className="mt-2 w-full">
            <Button
              type="submit"
              width="full"
              loading={isPending}
              className={authPrimaryButtonClassName}
            >
              Sign in
            </Button>
          </div>
        </form>

        {/* Kept outside the form: it isn't part of the credentials submit. */}
        <AuthDivider />
        <GoogleSignInButton />

        <AuthFooterText>
          Don&apos;t have an account?{" "}
          <AuthLink href="/auth/register" direction="forward">Create an account</AuthLink>
        </AuthFooterText>
      </div>
    </AuthSplitLayout>
  );
};

export default Login;
