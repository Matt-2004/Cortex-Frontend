import type { ReactNode } from "react";
import { plexMono, roboto } from "@/app/features/landing/fonts";

/* Every /auth screen uses the landing page's theme. This layout provides its
   two extra fonts (Roboto headings, mono labels); the rest of the look lives in
   features/auth/ui/AuthComponents.tsx. */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className={`${roboto.variable} ${plexMono.variable}`}>
      {children}
    </div>
  );
}
