import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import ToastProvider from "./features/toast/provider/ToastProvider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: "Cortex",
    template: "%s",
  },
  description:
    "Cortex embeds an AI assistant on your website that answers policy questions and recommends content from your own documents and site.",
  applicationName: "Cortex",
  icons: {
    // Dark mark on light browser chrome, light mark on dark browser chrome.
    icon: [
      {
        url: "/brand/cortex-cx-mark.svg",
        type: "image/svg+xml",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/brand/cortex-cx-mark-on-dark.svg",
        type: "image/svg+xml",
        media: "(prefers-color-scheme: dark)",
      },
    ],
    shortcut: "/brand/cortex-cx-mark.svg",
  },
  openGraph: {
    siteName: "Cortex",
    title: "Cortex",
    description:
    "Cortex embeds an AI assistant on your website that answers policy questions and recommends content from your own documents and site.",
    images: [{ url: "/brand/cortex-cx-mark.svg", width: 200, height: 200, alt: "Cortex" }],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F4F6F8" },
    { media: "(prefers-color-scheme: dark)", color: "#12172A" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
