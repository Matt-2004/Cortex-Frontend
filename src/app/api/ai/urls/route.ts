import { aiFetch, relayJson, withAiService } from "@/app/features/ai/server/aiServiceClient";

/** POST /api/ai/urls — fetch a public web page and add it ({ url }). */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.url !== "string") {
    return Response.json({ detail: "Send { url }." }, { status: 400 });
  }
  return withAiService(async () =>
    relayJson(
      await aiFetch("/sources/url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: body.url }),
      }),
    ),
  );
}
