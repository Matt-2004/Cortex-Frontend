import type { Metadata } from "next";
import { UserDataProvider } from "./features/navbar/context/UserDataContext";
import ToastProvider from "./features/toast/provider/ToastProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gear Up Authentication",
  description: "Sign in or create a Gear Up account.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <UserDataProvider>
          <ToastProvider>{children}</ToastProvider>
        </UserDataProvider>
      </body>
    </html>
  );
}
