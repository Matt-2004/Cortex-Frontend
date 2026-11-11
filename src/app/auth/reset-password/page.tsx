import { Metadata } from "next";
import { Suspense } from "react";
import ResetPassword from "@/app/features/auth/resetPassword/ui/resetPassword";

// Step 2 of password recovery: opened from the emailed link
// (/auth/reset-password?token=…) to choose a new password.

export const metadata: Metadata = {
  title: "Set a new password · Cortex",
  description: "Set a new password for your Cortex account.",
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
      <ResetPassword />
    </Suspense>
  );
};

export default Page;
