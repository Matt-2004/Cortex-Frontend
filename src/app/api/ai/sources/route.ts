import { aiFetch, relayJson, withAiService } from "@/app/features/ai/server/aiServiceClient";

/** GET /api/ai/sources — list the documents in the knowledge base. */
export async function GET() {
  return withAiService(async () => relayJson(await aiFetch("/sources")));
}
