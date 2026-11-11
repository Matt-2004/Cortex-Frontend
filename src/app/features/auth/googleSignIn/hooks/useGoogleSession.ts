"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getSession, signOut } from "next-auth/react";
import { useToast } from "@/app/features/toast/hooks/useToast";
import {
  SIGN_IN_PATH,
  useApiErrorHandler,
} from "@/app/shared/hooks/useApiErrorHandler";
import { authApi } from "../../api/authApi";
import { PATH_AFTER_SIGN_IN } from "../../signIn/hooks/useSignIn";

// Google (NextAuth) --> /auth/google/callback --> authApi.googleSession
// (sets Cortex session cookies) --> redirect

export const useGoogleSession = () => {
  const router = useRouter();
  const { addToastMessage } = useToast();
  const handleApiError = useApiErrorHandler();
  const [failed, setFailed] = useState(false);
  // Guards against the double effect run in React Strict Mode.
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const exchange = async () => {
      const idToken = (await getSession())?.idToken;
      if (!idToken) {
        setFailed(true);
        addToastMessage("error", "Google sign-in failed. Please try again.");
        router.replace(SIGN_IN_PATH);
        return;
      }

      try {
        await authApi.googleSession({ idToken });
        addToastMessage("success", "Signed in.");
        router.replace(PATH_AFTER_SIGN_IN);
      } catch (error) {
        setFailed(true);
        handleApiError(error);
        // Drop the NextAuth session so the next attempt starts clean.
        await signOut({ redirect: false });
        router.replace(SIGN_IN_PATH);
      }
    };

    void exchange();
  }, [addToastMessage, handleApiError, router]);

  return { failed };
};
