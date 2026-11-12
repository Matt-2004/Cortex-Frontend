import { aiFetch, relayJson, withAiService } from "@/app/features/ai/server/aiServiceClient";

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024; // matches the AI service default (CORTEX_AI_MAX_UPLOAD_MB=20)

/** POST /api/ai/documents — upload one file (multipart field `file`). */
export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ detail: "Expected a multipart form with a `file` field." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return Response.json({ detail: "Choose a non-empty file to upload." }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return Response.json({ detail: "File is larger than 20 MB." }, { status: 413 });
  }

  // Forward only the fields the AI service expects.
  const upstream = new FormData();
  upstream.set("file", file, file.name);

  return withAiService(async () => relayJson(await aiFetch("/documents", { method: "POST", body: upstream })));
}
