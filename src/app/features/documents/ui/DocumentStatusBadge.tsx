import { Badge, type BadgeTone } from "@/app/features/console/ui/consoleUi";
import type { DocumentStatus } from "../types/document.types";

/** Each status as the backend reports it; nothing here moves a status on. */
export const DOCUMENT_STATUS: Record<
  DocumentStatus,
  { label: string; tone: BadgeTone; hint: string }
> = {
  AwaitingUpload: {
    label: "Awaiting upload",
    tone: "warning",
    hint: "Started, but the file was never confirmed. Delete it to free its share of the plan.",
  },
  Pending: {
    label: "Pending",
    tone: "neutral",
    hint: "Stored. Waiting to be processed.",
  },
  Processing: { label: "Processing", tone: "info", hint: "Being processed." },
  Ready: { label: "Ready", tone: "success", hint: "Processed." },
  Failed: { label: "Failed", tone: "danger", hint: "Processing failed." },
};

export const documentStatusLabel = (status: DocumentStatus) =>
  DOCUMENT_STATUS[status]?.label ?? status;

export const DocumentStatusBadge = ({ status }: { status: DocumentStatus }) => {
  const meta = DOCUMENT_STATUS[status] ?? {
    label: status,
    tone: "neutral" as const,
    hint: "",
  };
  return (
    <span title={meta.hint}>
      <Badge tone={meta.tone}>{meta.label}</Badge>
    </span>
  );
};
