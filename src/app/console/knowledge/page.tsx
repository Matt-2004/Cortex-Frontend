import type { Metadata } from "next";
import { KnowledgeBase } from "@/app/features/ai/ui/KnowledgeBase";

export const metadata: Metadata = {
  title: "Knowledge base",
  description:
    "Upload the documents and pages your website assistant answers from.",
};

export default function KnowledgePage() {
  return <KnowledgeBase />;
}
