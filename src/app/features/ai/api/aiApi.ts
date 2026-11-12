/**
 * Browser-side calls to our own /api/ai/* route handlers (which forward to
 * the AI service with the API key). Never call the AI service directly.
 */

import type {
  AiErrorBody,
  ChatRecommendation,
  ChatRequestBody,
  ChatSource,
  IngestResponse,
  KnowledgeSource,
  SourceListResponse,
} from "../types/ai.types";

export class AiApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "AiApiError";
  }
}

const FALLBACK_MESSAGES: Record<number, string> = {
  401: "The AI service rejected our API key. Check CORTEX_AI_API_KEY.",
  413: "That file is too large (max 20 MB).",
  503: "The AI service is unavailable right now. Please try again shortly.",
};

async function toError(response: Response): Promise<AiApiError> {
  let message =
    FALLBACK_MESSAGES[response.status] ??
    `Request failed (${response.status}).`;
  try {
    const body = (await response.json()) as AiErrorBody;
    if (typeof body.detail === "string") message = body.detail;
    else if (Array.isArray(body.detail) && body.detail[0]?.msg)
      message = body.detail[0].msg;
  } catch {
    // keep the fallback message
  }
  return new AiApiError(message, response.status);
}

async function request<T>(input: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(input, init);
  } catch {
    throw new AiApiError(
      "Network error. Check your connection and try again.",
      0,
    );
  }
  if (!response.ok) throw await toError(response);
  return (response.status === 204 ? undefined : await response.json()) as T;
}

// ── Knowledge base ─────────────────────────────────────────────────

export async function listSources(): Promise<KnowledgeSource[]> {
  const data = await request<SourceListResponse>("/api/ai/sources", {
    cache: "no-store",
  });
  return data.sources;
}

export function uploadDocument(file: File): Promise<IngestResponse> {
  const form = new FormData();
  form.set("file", file);
  return request<IngestResponse>("/api/ai/documents", {
    method: "POST",
    body: form,
  });
}

export function addUrl(url: string): Promise<IngestResponse> {
  return request<IngestResponse>("/api/ai/urls", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
}

export function addText(title: string, text: string): Promise<IngestResponse> {
  return request<IngestResponse>("/api/ai/documents/text", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, text }),
  });
}

export function deleteSource(sourceId: string): Promise<void> {
  return request<void>(`/api/ai/sources/${encodeURIComponent(sourceId)}`, {
    method: "DELETE",
  });
}

// ── Chat (Server-Sent Events) ──────────────────────────────────────

export interface ChatStreamHandlers {
  onSources: (sources: ChatSource[]) => void;
  onToken: (text: string) => void;
  onRecommendations: (recs: ChatRecommendation[]) => void;
  onDone: (info: { grounded: boolean }) => void;
}

/**
 * Sends a question and calls the handlers as events arrive.
 * Resolves when the stream ends; rejects with AiApiError on failure.
 */
export async function streamChat(
  body: ChatRequestBody,
  handlers: ChatStreamHandlers,
  signal?: AbortSignal,
): Promise<void> {
  let response: Response;
  try {
    response = await fetch("/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if ((error as Error).name === "AbortError") throw error;
    throw new AiApiError(
      "Network error. Check your connection and try again.",
      0,
    );
  }
  if (!response.ok || !response.body) throw await toError(response);

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const dispatch = (block: string) => {
    let event = "message";
    const dataLines: string[] = [];
    for (const line of block.split("\n")) {
      if (line.startsWith("event:")) event = line.slice(6).trim();
      else if (line.startsWith("data:"))
        dataLines.push(line.slice(5).trimStart());
    }
    if (!dataLines.length) return;
    const data = JSON.parse(dataLines.join("\n"));
    switch (event) {
      case "sources":
        handlers.onSources(data);
        break;
      case "token":
        handlers.onToken(data.text ?? "");
        break;
      case "recommendations":
        handlers.onRecommendations(data);
        break;
      case "done":
        handlers.onDone(data);
        break;
      case "error":
        throw new AiApiError(
          data.detail ?? "The assistant couldn't finish its answer.",
          502,
        );
    }
  };

  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    // Events are separated by a blank line.
    let boundary: number;
    while ((boundary = buffer.indexOf("\n\n")) !== -1) {
      const block = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      if (block.trim()) dispatch(block);
    }
  }
  if (buffer.trim()) dispatch(buffer);
}
