import type { Metadata } from "next";
import { OrganizationsHome } from "@/app/features/organizations/ui/OrganizationsHome";

export const metadata: Metadata = { title: "Organizations" };

export default function OrganizationsPage() {
  return <OrganizationsHome />;
}
