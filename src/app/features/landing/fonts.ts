import { IBM_Plex_Mono, Roboto } from "next/font/google";

/* Landing-page type. Inter (the brand font, loaded in the root layout) stays
   for body copy and UI; these two add contrast on the marketing page only.
   Their CSS variables are applied on the page wrapper in app/page.tsx and
   exposed as the `font-display` and `font-receipt` utilities in globals.css. */

/** Headlines and titles. */
export const roboto = Roboto({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-roboto",
});

/** Monospace for labels, prices and file names. */
export const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
  variable: "--font-plex-mono",
});
