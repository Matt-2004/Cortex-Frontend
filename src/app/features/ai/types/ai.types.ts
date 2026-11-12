/**
 * Shapes returned by the Cortex AI service (FastAPI, ~/Desktop/RAG).
 * Kept in sync with app/schemas/*.py there.
 */

export type SourceType = "file" | "url" | "text";

export interface KnowledgeSource {
  source_id: string;
  source_type: SourceType | null;
  title: string | null;
  url: string | null;
  chunks: number;
  /** Unix seconds */
  ingested_at: number | null;
}

export interface SourceListResponse {
  tenant_id: string;
  sources: KnowledgeSource[];
}

export interface IngestResponse {
  tenant_id: string;
  source_id: string;
  source_type: SourceType;
  title: string;
  chunks: number;
}

export interface ChatSource {
  index: number;
  source_id: string;
  title: string;
  url: string | null;
  page: number | null;
  chunk: number;
  score: number;
  snippet: string;
}

export interface CatalogItem {
  id: string;
  title: string;
  description: string;
  url: string | null;
  image_url: string | null;
  category: string | null;
  tags: string[];
  price: number | null;
  currency: string | null;
  available: boolean;
}

export interface ChatRecommendation {
  item: CatalogItem;
  score: number;
  reason: string;
}

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface ChatRequestBody {
  message: string;
  history: ChatTurn[];
  include_recommendations?: boolean;
  business_name?: string;
}

/** Error body from the AI service (FastAPI) or our proxy. */
export interface AiErrorBody {
  detail: string | { msg: string }[];
}
