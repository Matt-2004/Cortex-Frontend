import type { Metadata } from "next";
import { ChatPanel } from "@/app/features/ai/ui/ChatPanel";

export const metadata: Metadata = {
  title: "Chat",
  description:
    "Ask your website assistant questions, answered from your knowledge base.",
};

export default function ChatPage() {
  return <ChatPanel />;
}
