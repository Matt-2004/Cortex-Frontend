import { Metadata } from "next";
import Login from "../../features/auth/signIn/ui/Login";

export const metadata: Metadata = {
  title: "Sign in · Cortex",
  description:
    "Sign in to Cortex to manage your website assistant, documents and sources.",
};

const Page = () => {
  return <Login />;
};

export default Page;
