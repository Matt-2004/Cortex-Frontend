import type { Metadata } from "next";
import { Suspense } from "react";
import InvitationPage from "@/app/features/invitations/ui/InvitationPage";

export const metadata: Metadata = {
  title: "Invitation · Cortex",
  description: "Accept an invitation to join an organization on Cortex.",
  // Each page is one person's private link.
  robots: { index: false, follow: false },
};

const Page = () => {
  return (
    // useSearchParams() (for the token) needs a Suspense boundary.
    <Suspense
      fallback={
        <main className="flex min-h-dvh items-center justify-center bg-white text-sm text-brand-ink-muted">
          <p role="status">Loading…</p>
        </main>
      }
    >
      <InvitationPage />
    </Suspense>
  );
};

export default Page;
