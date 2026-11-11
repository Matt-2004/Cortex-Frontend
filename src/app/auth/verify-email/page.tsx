import { Metadata } from "next";
import { Suspense } from "react";
import VerifyEmail from "@/app/features/auth/emailValidation/ui/VerifyEmail";

// ?token=… (link from the email) → verify + sign in.
// ?sent=1&email=… → "check your inbox" after registering.
// Otherwise → resend the verification email.

export const metadata: Metadata = {
  title: "Verify your email · Cortex",
  description: "Verify your email to activate your Cortex account.",
};

const Page = () => {
  return (
    // useSearchParams() (for the token) needs a Suspense boundary.
    <Suspense
      fallback={
        <main className="flex min-h-dvh items-center justify-center bg-white text-sm text-[#4B5468]">
          <p role="status">Loading…</p>
        </main>
      }
    >
      <VerifyEmail />
    </Suspense>
  );
};

export default Page;
