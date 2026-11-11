import { Metadata } from "next";
import EmailValidation from "@/app/features/auth/emailValidation/ui/emailValidation";

// Step 1 of password recovery: ask for the email and send a reset link.
// Step 2 is /auth/reset-password?token=… (the link inside that email).

export const metadata: Metadata = {
  title: "Forgot password · Cortex",
  description: "Get a link to reset the password for your Cortex account.",
};

const Page = () => {
  return <EmailValidation variant="reset-password" />;
};

export default Page;
