import { Metadata } from "next";
import Register from "../../features/auth/signUp/ui/Register";

export const metadata: Metadata = {
  title: "Create account · Cortex",
  description:
    "Create a Cortex account and embed an AI assistant on your website, powered by your own documents.",
};

const Page = () => {
  return <Register />;
};

export default Page;
