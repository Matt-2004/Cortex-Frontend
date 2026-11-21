"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Button from "@/app/shared/ui/Button";
import {
  AuthAlert,
  AuthDivider,
  AuthFooterText,
  AuthLink,
  AuthSplitLayout,
  authPrimaryButtonClassName,
} from "@/app/features/auth/ui/AuthComponents";
import {
  GOOGLE_CALLBACK_PATH,
  GoogleSignInButton,
} from "@/app/features/auth/ui/GoogleSignInButton";
import { formatDate } from "@/app/features/console/ui/consoleUi";
import {
  roleLabel,
  type InvitationPreview,
} from "@/app/features/organizations/types/organization.types";
import { SIGN_IN_PATH } from "@/app/shared/hooks/useApiErrorHandler";
import { withReturnTo } from "@/app/shared/utils/returnTo";
import { useInvitation } from "../hooks/useInvitation";
import { invitationPath } from "../types/invitation.types";
import { InvitedRegisterForm } from "./InvitedRegisterForm";

const EYEBROW = "Invitation";
const HEADLINE = "Join your team on Cortex.";

const joinTitle = (preview: InvitationPreview) =>
  `Join ${preview.organizationName}`;

const JoinSubtitle = ({ preview }: { preview: InvitationPreview }) => (
  <>
    {preview.invitedByName} invited you as {roleLabel(preview.role)}. The
    invitation expires on {formatDate(preview.expiresAt)}.
  </>
);

/** /invitations/accept?token=… — the link in the invitation email. */
export const InvitationPage = () => {
  const token = (useSearchParams().get("token") ?? "").trim();
  const {
    view,
    retry,
    accept,
    accepting,
    signOut,
    signingOut,
    markInvalid,
    markConflict,
  } = useInvitation(token);

  // Sign-in (password or Google) comes back here with the token.
  const here = invitationPath(token);
  const signInHref = withReturnTo(SIGN_IN_PATH, here);
  const googleCallbackUrl = withReturnTo(GOOGLE_CALLBACK_PATH, here);

  switch (view.kind) {
    case "loading":
      return (
        <AuthSplitLayout
          eyebrow={EYEBROW}
          headline={HEADLINE}
          title="Invitation"
        >
          <p role="status" className="text-sm text-brand-ink-muted">
            Loading the invitation…
          </p>
        </AuthSplitLayout>
      );

    case "error":
      return (
        <AuthSplitLayout
          eyebrow={EYEBROW}
          headline={HEADLINE}
          title="Invitation"
        >
          <div className="flex flex-col gap-5">
            <AuthAlert title="The invitation could not be loaded">
              {view.message}
            </AuthAlert>
            <Button
              type="button"
              width="full"
              onClick={retry}
              className={authPrimaryButtonClassName}
            >
              Try again
            </Button>
          </div>
        </AuthSplitLayout>
      );

    case "invalid":
      return (
        <AuthSplitLayout
          eyebrow={EYEBROW}
          headline={HEADLINE}
          title="This invitation can't be used"
        >
          <div className="flex flex-col gap-4">
            <AuthAlert title={view.message}>
              Ask the person who invited you to send a new invitation.
            </AuthAlert>
            {/* Covers a join that succeeded but whose response was lost. */}
            <AuthFooterText>
              Already joined?{" "}
              <AuthLink href="/console/organizations">
                Open the console
              </AuthLink>
            </AuthFooterText>
          </div>
        </AuthSplitLayout>
      );

    case "register":
      return (
        <AuthSplitLayout
          eyebrow={EYEBROW}
          headline={HEADLINE}
          title={joinTitle(view.preview)}
          subtitle={<JoinSubtitle preview={view.preview} />}
        >
          <div className="flex w-full flex-col gap-4">
            <InvitedRegisterForm
              token={token}
              email={view.preview.email}
              organizationName={view.preview.organizationName}
              onInvalid={markInvalid}
              onConflict={markConflict}
            />
            <AuthDivider />
            <GoogleSignInButton callbackUrl={googleCallbackUrl} />
            <AuthFooterText>
              Already have an account?{" "}
              <AuthLink href={signInHref} direction="back">
                Sign in
              </AuthLink>
            </AuthFooterText>
          </div>
        </AuthSplitLayout>
      );

    case "signIn":
      return (
        <AuthSplitLayout
          eyebrow={EYEBROW}
          headline={HEADLINE}
          title={joinTitle(view.preview)}
          subtitle={<JoinSubtitle preview={view.preview} />}
        >
          <div className="flex w-full flex-col gap-4">
            {view.conflict ? (
              // A 409 can mean more than "a verified account exists", so
              // show the backend's message and offer sign-in, nothing more.
              <AuthAlert tone="info" title={view.conflict}>
                If you have an account for{" "}
                <strong className="text-brand-ink">{view.preview.email}</strong>
                , sign in to accept the invitation.
              </AuthAlert>
            ) : (
              <p className="text-sm text-brand-ink-muted">
                Sign in as{" "}
                <strong className="font-medium text-brand-ink">
                  {view.preview.email}
                </strong>{" "}
                to accept the invitation.
              </p>
            )}
            <Link
              href={signInHref}
              className={`${authPrimaryButtonClassName} flex w-full items-center justify-center`}
            >
              Sign in
            </Link>
            <AuthDivider />
            <GoogleSignInButton callbackUrl={googleCallbackUrl} />
          </div>
        </AuthSplitLayout>
      );

    case "accept":
      return (
        <AuthSplitLayout
          eyebrow={EYEBROW}
          headline={HEADLINE}
          title={joinTitle(view.preview)}
          subtitle={<JoinSubtitle preview={view.preview} />}
        >
          <div className="flex w-full flex-col gap-5">
            <p className="text-sm text-brand-ink-muted">
              Signed in as{" "}
              <strong className="font-medium text-brand-ink">
                {view.user.email}
              </strong>
              .
            </p>
            <Button
              type="button"
              width="full"
              loading={accepting}
              onClick={accept}
              className={authPrimaryButtonClassName}
            >
              Accept invitation
            </Button>
          </div>
        </AuthSplitLayout>
      );

    case "mismatch":
      return (
        <AuthSplitLayout
          eyebrow={EYEBROW}
          headline={HEADLINE}
          title={joinTitle(view.preview)}
          subtitle={<JoinSubtitle preview={view.preview} />}
        >
          <div className="flex w-full flex-col gap-5">
            <AuthAlert title={`This invitation is for ${view.preview.email}`}>
              You&apos;re signed in as{" "}
              <strong className="text-brand-ink">{view.user.email}</strong>.
              Sign out, then continue with the invited email.
            </AuthAlert>
            <Button
              type="button"
              width="full"
              loading={signingOut}
              onClick={signOut}
              className={authPrimaryButtonClassName}
            >
              Sign out and continue
            </Button>
          </div>
        </AuthSplitLayout>
      );
  }
};

export default InvitationPage;
