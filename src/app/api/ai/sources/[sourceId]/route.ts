import { aiFetch, relayJson, withAiService } from "@/app/features/ai/server/aiServiceClient";

/** DELETE /api/ai/sources/{sourceId} — remove one document from the knowledge base. */
export async function DELETE(_request: Request, { params }: { params: Promise<{ sourceId: string }> }) {
  const { sourceId } = await params;
  return withAiService(async () =>
    relayJson(await aiFetch(`/sources/${encodeURIComponent(sourceId)}`, { method: "DELETE" })),
  );
}
