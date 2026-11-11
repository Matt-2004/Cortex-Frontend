import type { ReactNode } from "react";
import { newsreader, plexMono } from "@/app/features/landing/fonts";

/* Every /auth screen uses the landing page's theme. This layout provides its
   two extra fonts (serif headings, mono labels); the rest of the look lives in
   features/auth/ui/AuthComponents.tsx. */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className={`${newsreader.variable} ${plexMono.variable}`}>
      {children}
    </div>
  );
}
