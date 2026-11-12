import { aiFetch, relayJson, withAiService } from "@/app/features/ai/server/aiServiceClient";

/** POST /api/ai/documents/text — add pasted text ({ title, text }). */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.title !== "string" || typeof body.text !== "string") {
    return Response.json({ detail: "Send { title, text }." }, { status: 400 });
  }
  return withAiService(async () =>
    relayJson(
      await aiFetch("/documents/text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: body.title, text: body.text }),
      }),
    ),
  );
}
