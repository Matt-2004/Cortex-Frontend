"use client";

import { useGoogleSession } from "@/app/features/auth/googleSignIn/hooks/useGoogleSession";

const Page = () => {
  const { failed } = useGoogleSession();

  return (
    <main className="flex min-h-dvh items-center justify-center bg-white text-sm text-[#4B5468]">
      <p role="status" aria-live="polite">
        {failed ? "Redirecting to sign in…" : "Signing you in with Google…"}
      </p>
    </main>
  );
};

export default Page;
