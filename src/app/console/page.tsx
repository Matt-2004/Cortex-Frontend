import type { Metadata } from "next";
import { Overview } from "@/app/features/console/ui/Overview";

export const metadata: Metadata = { title: "Overview" };

export default function ConsolePage() {
  return <Overview />;
}
