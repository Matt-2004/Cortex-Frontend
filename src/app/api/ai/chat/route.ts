import { aiFetch, relayJson, withAiService } from "@/app/features/ai/server/aiServiceClient";
import type { ChatRequestBody, ChatTurn } from "@/app/features/ai/types/ai.types";

const MAX_HISTORY = 12;

/**
 * POST /api/ai/chat — ask a question; the answer is streamed back as
 * Server-Sent Events, passed straight through from the AI service:
 *   sources → token… → recommendations? → done   (or error)
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as ChatRequestBody | null;
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  if (!message) {
    return Response.json({ detail: "Type a question first." }, { status: 400 });
  }

  const history: ChatTurn[] = Array.isArray(body?.history)
    ? body.history
        .filter(
          (t): t is ChatTurn =>
            (t?.role === "user" || t?.role === "assistant") && typeof t.content === "string" && t.content.trim() !== "",
        )
        .slice(-MAX_HISTORY)
        .map((t) => ({ role: t.role, content: t.content.slice(0, 4000) }))
    : [];

  return withAiService(async () => {
    const upstream = await aiFetch("/chat/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
      body: JSON.stringify({
        message: message.slice(0, 2000),
        history,
        include_recommendations: Boolean(body?.include_recommendations),
        ...(body?.business_name ? { business_name: String(body.business_name).slice(0, 120) } : {}),
      }),
      // Stop generating on the AI side if the visitor cancels.
      signal: request.signal,
    });

    if (!upstream.ok || !upstream.body) return relayJson(upstream);

    return new Response(upstream.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no",
      },
    });
  });
}
