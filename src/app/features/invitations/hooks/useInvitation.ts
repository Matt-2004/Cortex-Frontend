"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useResource } from "@/app/features/console/hooks/useResource";
import { authApi } from "@/app/features/auth/api/authApi";
import type { User } from "@/app/features/auth/types/auth-api.types";
import { organizationsApi } from "@/app/features/organizations/api/organizationsApi";
import type { InvitationPreview } from "@/app/features/organizations/types/organization.types";
import { useToast } from "@/app/features/toast/hooks/useToast";
import { useApiErrorHandler } from "@/app/shared/hooks/useApiErrorHandler";
import {
  ApiError,
  isAbortError,
  toApiError,
} from "@/app/shared/utils/errors/apiError";
import { PATH_AFTER_JOINING } from "../types/invitation.types";

// /invitations/accept?token=… --> preview (public) + me, in parallel
//   signed out, no account   --> register-invited (signs in + joins)
//   signed out, has account  --> sign in, come back via ?returnTo=
//   signed in, same email    --> accept
//   signed in, other email   --> sign out, then one of the above

export type InvitationView =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "invalid"; message: string }
  | { kind: "register"; preview: InvitationPreview }
  | { kind: "signIn"; preview: InvitationPreview; conflict?: string }
  | { kind: "accept"; preview: InvitationPreview; user: User }
  | { kind: "mismatch"; preview: InvitationPreview; user: User };

/**
 * The signed-in user, or null when signed out. A 401 (after the refresh
 * attempt) means "not signed in" here, not "session expired": this page is
 * public, so it must not use the global redirect to sign-in.
 */
async function currentUser(signal: AbortSignal): Promise<User | null> {
  try {
    return await authApi.me(signal);
  } catch (error) {
    if (!isAbortError(error) && toApiError(error).status === 401) return null;
    throw error;
  }
}

const sameEmail = (a: string, b: string) =>
  a.trim().toLowerCase() === b.trim().toLowerCase();

export function useInvitation(token: string) {
  const router = useRouter();
  const { addToastMessage } = useToast();
  const handleApiError = useApiErrorHandler();

  const load = useCallback(
    async (signal: AbortSignal) => {
      if (!token) {
        throw new ApiError({
          status: 400,
          message:
            "This invitation link is incomplete. Open the link from the email again.",
        });
      }
      const [preview, user] = await Promise.all([
        organizationsApi.previewInvitation(token, signal),
        currentUser(signal),
      ]);
      return { preview, user };
    },
    [token],
  );
  const { resource, reload, retry } = useResource(load);

  // Set when a later call shows the invitation no longer works, or that the
  // invited email can't be registered (register-invited 409).
  const [invalidMessage, setInvalidMessage] = useState<string | null>(null);
  const [conflict, setConflict] = useState<string | null>(null);

  const [accepting, setAccepting] = useState(false);
  const acceptingRef = useRef(false);
  const [signingOut, setSigningOut] = useState(false);

  let view: InvitationView;
  if (invalidMessage) {
    view = { kind: "invalid", message: invalidMessage };
  } else if (resource.status === "loading") {
    view = { kind: "loading" };
  } else if (resource.status === "error") {
    // The preview answers 400 for every unusable link (invalid, expired,
    // cancelled, already used); anything else is worth retrying.
    view =
      resource.error.status === 400
        ? { kind: "invalid", message: resource.error.message }
        : { kind: "error", message: resource.error.message };
  } else {
    const { preview, user } = resource.data;
    if (user) {
      view = sameEmail(user.email, preview.email)
        ? { kind: "accept", preview, user }
        : { kind: "mismatch", preview, user };
    } else if (conflict) {
      view = { kind: "signIn", preview, conflict };
    } else {
      view = preview.accountExists
        ? { kind: "signIn", preview }
        : { kind: "register", preview };
    }
  }

  const accept = async () => {
    if (acceptingRef.current) return;
    acceptingRef.current = true;
    setAccepting(true);
    let leaving = false;
    try {
      const organization = await organizationsApi.acceptInvitation({ token });
      leaving = true;
      addToastMessage("success", `You joined ${organization.name}.`);
      router.replace(PATH_AFTER_JOINING);
    } catch (error) {
      const apiError = toApiError(error);
      if (apiError.status === 401) {
        // Session ended while on the page: show the sign-in options here
        // instead of the global redirect, which would drop the invitation.
        addToastMessage("info", "Your session ended. Sign in again to accept.");
        await reload();
        return;
      }
      handleApiError(apiError, {
        onStatus: {
          400: (e) => {
            setInvalidMessage(e.message);
            return true;
          },
          409: (e) => {
            // Already a member (joined at the same moment elsewhere).
            leaving = true;
            addToastMessage("info", e.message);
            router.replace(PATH_AFTER_JOINING);
            return true;
          },
        },
      });
    } finally {
      // On success keep the button locked until the redirect happens.
      if (!leaving) {
        acceptingRef.current = false;
        setAccepting(false);
      }
    }
  };

  /** Signed in with another email: sign out, then show the right option. */
  const signOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await authApi.logout();
      await reload();
    } catch (error) {
      handleApiError(error);
    } finally {
      setSigningOut(false);
    }
  };

  return {
    view,
    retry,
    accept,
    accepting,
    signOut,
    signingOut,
    markInvalid: setInvalidMessage,
    markConflict: setConflict,
  };
}
