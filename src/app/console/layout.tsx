import type { Metadata } from "next";
import { newsreader, plexMono } from "@/app/features/landing/fonts";
import { ConsoleShell } from "@/app/features/console/ui/ConsoleShell";

export const metadata: Metadata = {
  title: { default: "Console · Cortex", template: "%s · Cortex" },
  description: "Manage your Cortex organizations and the people in them.",
  robots: { index: false, follow: false },
};

/** Signed-in area. The shell checks the session and sends visitors to sign in. */
export default function ConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`${newsreader.variable} ${plexMono.variable}`}>
      <ConsoleShell>{children}</ConsoleShell>
    </div>
  );
}
