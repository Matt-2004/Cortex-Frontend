"use client";

import { useSearchParams } from "next/navigation";
import {
  AuthAlert,
  AuthFooterText,
  AuthLink,
  AuthSplitLayout,
} from "@/app/features/auth/ui/AuthComponents";
import { normalizeResetToken } from "../../resetPassword/hooks/useResetPassword";
import { useVerifyEmailToken } from "../hooks/useVerifyEmailToken";
import EmailValidation from "./emailValidation";

/**
 * /auth/verify-email
 *   ?token=…            → verify the address and sign in (link from the email)
 *   ?sent=1&email=…     → "check your inbox" after registering
 *   (nothing)           → resend form
 */
const VerifyEmail = () => {
  const searchParams = useSearchParams();
  const token = normalizeResetToken(
    searchParams.get("token") ?? searchParams.get("Token"),
  );
  const email = searchParams.get("email") ?? "";
  const justRegistered = searchParams.get("sent") === "1" && Boolean(email);

  if (token) return <VerifyToken token={token} />;

  return (
    <EmailValidation
      variant="verification"
      initialEmail={email}
      notice={
        justRegistered ? (
          <AuthAlert tone="info" title="Check your inbox">
            We sent a verification link to <strong>{email}</strong>. Open it to
            activate your account. Didn&apos;t get it? Check spam, or resend it
            below.
          </AuthAlert>
        ) : null
      }
    />
  );
};

const VerifyToken = ({ token }: { token: string }) => {
  const { status, errorMessage } = useVerifyEmailToken(token);

  if (status === "failed") {
    return (
      <EmailValidation
        variant="verification"
        notice={
          <AuthAlert title="We couldn't verify your email">
            {errorMessage} Enter your email to get a new link.
          </AuthAlert>
        }
      />
    );
  }

  return (
    <AuthSplitLayout
      eyebrow="One more step"
      headline="Verify your email address."
      title={status === "verified" ? "Email verified" : "Verifying your email…"}
      subtitle={
        status === "verified"
          ? "Taking you to your dashboard."
          : "This only takes a moment."
      }
    >
      <div className="flex w-full flex-col gap-4">
        <AuthAlert
          tone="info"
          title={
            status === "verified" ? "You're signed in" : "Checking your link…"
          }
        />
        <AuthFooterText>
          <AuthLink href="/auth/login" direction="back">
            Back to sign in
          </AuthLink>
        </AuthFooterText>
      </div>
    </AuthSplitLayout>
  );
};

export default VerifyEmail;
