import type { ReactNode } from "react";
import { plexMono, roboto } from "@/app/features/landing/fonts";

/* The invitation page reuses the auth screens' look (features/auth/ui), so it
   needs the same two extra fonts as app/auth/layout.tsx. */
export default function InvitationsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className={`${roboto.variable} ${plexMono.variable}`}>{children}</div>
  );
}
