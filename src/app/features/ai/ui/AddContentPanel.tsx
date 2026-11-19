"use client";

import { useId, useRef, useState } from "react";
import { clsx } from "clsx";
import {
  CheckCircle2,
  FileText,
  Globe,
  Loader2,
  Type,
  UploadCloud,
  XCircle,
} from "lucide-react";
import { addText, addUrl, AiApiError, uploadDocument } from "../api/aiApi";

const ACCEPT = ".pdf,.txt,.md,.html,.htm";
const ACCEPTED_EXTENSIONS = ["pdf", "txt", "md", "html", "htm"];
const MAX_BYTES = 20 * 1024 * 1024;

type Tab = "upload" | "url" | "text";

interface UploadItem {
  key: string;
  name: string;
  size: number;
  status: "queued" | "uploading" | "done" | "error";
  message?: string;
}

const formatBytes = (bytes: number) =>
  bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

const errorMessage = (error: unknown) =>
  error instanceof AiApiError
    ? error.message
    : "Something went wrong. Please try again.";

const inputClass =
  "w-full rounded-control border border-brand-ink/15 bg-white px-3 py-2.5 text-sm text-brand-ink placeholder:text-brand-ink-subtle focus:border-primary-700 focus:shadow-[0_0_0_3px_rgba(0,171,143,0.22)] focus:outline-none";

const primaryButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-control bg-brand-teal px-4 py-2.5 text-sm font-semibold text-brand-ink transition-colors hover:bg-primary-400 disabled:cursor-not-allowed disabled:opacity-50";

export const AddContentPanel = ({ onAdded }: { onAdded: () => void }) => {
  const [tab, setTab] = useState<Tab>("upload");
  const tabsId = useId();

  const tabs: { id: Tab; label: string; icon: typeof UploadCloud }[] = [
    { id: "upload", label: "Upload files", icon: UploadCloud },
    { id: "url", label: "Web page", icon: Globe },
    { id: "text", label: "Paste text", icon: Type },
  ];

  return (
    <section
      aria-labelledby={`${tabsId}-heading`}
      className="rounded-box border border-brand-ink/10 bg-white"
    >
      <div className="border-b border-brand-ink/10 px-5 pt-4">
        <h2 id={`${tabsId}-heading`} className="text-base font-semibold">
          Add content
        </h2>
        <div
          role="tablist"
          aria-label="Content type"
          className="mt-3 flex gap-1 overflow-x-auto"
        >
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              id={`${tabsId}-tab-${id}`}
              role="tab"
              type="button"
              aria-selected={tab === id}
              aria-controls={`${tabsId}-panel-${id}`}
              tabIndex={tab === id ? 0 : -1}
              onClick={() => setTab(id)}
              onKeyDown={(e) => {
                if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
                const i = tabs.findIndex((t) => t.id === tab);
                const next =
                  tabs[
                    (i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) %
                      tabs.length
                  ].id;
                setTab(next);
                document.getElementById(`${tabsId}-tab-${next}`)?.focus();
              }}
              className={clsx(
                "-mb-px inline-flex shrink-0 items-center gap-2 border-b-2 whitespace-nowrap px-3 pb-2.5 text-sm font-medium transition-colors",
                tab === id
                  ? "border-primary-700 text-brand-ink"
                  : "border-transparent text-brand-ink-muted hover:text-brand-ink",
              )}
            >
              <Icon aria-hidden="true" className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div
        role="tabpanel"
        id={`${tabsId}-panel-${tab}`}
        aria-labelledby={`${tabsId}-tab-${tab}`}
        className="p-5"
      >
        {tab === "upload" && <UploadTab onAdded={onAdded} />}
        {tab === "url" && <UrlTab onAdded={onAdded} />}
        {tab === "text" && <TextTab onAdded={onAdded} />}
      </div>
    </section>
  );
};

// ── Upload ───────────────────────────────────────────────────────────

const UploadTab = ({ onAdded }: { onAdded: () => void }) => {
  const [items, setItems] = useState<UploadItem[]>([]);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const busyRef = useRef(false);
  const queueRef = useRef<{ key: string; file: File }[]>([]);
  const inputId = useId();

  const update = (key: string, patch: Partial<UploadItem>) =>
    setItems((prev) =>
      prev.map((it) => (it.key === key ? { ...it, ...patch } : it)),
    );

  // Upload one at a time: indexing is CPU-heavy on the AI side.
  const drain = async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    while (queueRef.current.length) {
      const { key, file } = queueRef.current.shift()!;
      update(key, { status: "uploading" });
      try {
        const res = await uploadDocument(file);
        update(key, {
          status: "done",
          message: `${res.chunks} chunk${res.chunks === 1 ? "" : "s"} indexed`,
        });
        onAdded();
      } catch (error) {
        update(key, { status: "error", message: errorMessage(error) });
      }
    }
    busyRef.current = false;
  };

  const addFiles = (files: FileList | File[]) => {
    const next: UploadItem[] = [];
    for (const file of Array.from(files)) {
      const key = `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2, 7)}`;
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
      let problem: string | undefined;
      if (!ACCEPTED_EXTENSIONS.includes(ext))
        problem = "Unsupported type. Use PDF, TXT, MD or HTML.";
      else if (file.size === 0) problem = "This file is empty.";
      else if (file.size > MAX_BYTES) problem = "Larger than 20 MB.";

      next.push({
        key,
        name: file.name,
        size: file.size,
        status: problem ? "error" : "queued",
        message: problem,
      });
      if (!problem) queueRef.current.push({ key, file });
    }
    setItems((prev) => [...next, ...prev].slice(0, 20));
    void drain();
  };

  return (
    <div className="flex flex-col gap-4">
      <label
        htmlFor={inputId}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
        }}
        className={clsx(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-control border border-dashed px-6 py-10 text-center transition-colors",
          "focus-within:border-primary-700",
          dragging
            ? "border-primary-700 bg-brand-wash"
            : "border-brand-ink/20 bg-brand-wash/40 hover:border-brand-ink/35",
        )}
      >
        <UploadCloud aria-hidden="true" className="h-8 w-8 text-primary-700" />
        <span className="text-sm font-medium text-brand-ink">
          Drop files here or{" "}
          <span className="text-primary-700 underline underline-offset-4">
            browse
          </span>
        </span>
        <span className="text-xs text-brand-ink-subtle">
          PDF, TXT, Markdown or HTML · up to 20 MB each
        </span>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          multiple
          accept={ACCEPT}
          className="sr-only"
          onChange={(e) => {
            if (e.target.files?.length) addFiles(e.target.files);
            e.target.value = ""; // allow re-selecting the same file
          }}
        />
      </label>

      {items.length > 0 && (
        <ul
          aria-label="Uploads"
          aria-live="polite"
          className="flex flex-col divide-y divide-brand-ink/10 rounded-control border border-brand-ink/10"
        >
          {items.map((it) => (
            <li
              key={it.key}
              className="flex items-center gap-3 px-3 py-2.5 text-sm"
            >
              <FileText
                aria-hidden="true"
                className="h-4 w-4 shrink-0 text-brand-ink-subtle"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-brand-ink">{it.name}</p>
                <p
                  className={clsx(
                    "text-xs",
                    it.status === "error" ? "text-[#B42318]" : "text-brand-ink-subtle",
                  )}
                >
                  {it.status === "queued" &&
                    `Waiting · ${formatBytes(it.size)}`}
                  {it.status === "uploading" && "Uploading and indexing…"}
                  {(it.status === "done" || it.status === "error") &&
                    it.message}
                </p>
              </div>
              {it.status === "uploading" && (
                <Loader2
                  aria-hidden="true"
                  className="h-4 w-4 animate-spin text-primary-700"
                />
              )}
              {it.status === "done" && (
                <CheckCircle2
                  aria-label="Done"
                  className="h-4 w-4 text-primary-700"
                />
              )}
              {it.status === "error" && (
                <XCircle
                  aria-label="Failed"
                  className="h-4 w-4 text-[#B42318]"
                />
              )}
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-brand-ink-subtle">
        Large PDFs can take a minute: every page is split into chunks and
        embedded. Scanned (image-only) PDFs have no text and can&apos;t be
        indexed.
      </p>
    </div>
  );
};

// ── URL ──────────────────────────────────────────────────────────────

const UrlTab = ({ onAdded }: { onAdded: () => void }) => {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(
    null,
  );
  const id = useId();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = url.trim();
    if (!/^https?:\/\/\S+\.\S+/i.test(value)) {
      setStatus({
        ok: false,
        text: "Enter a full web address starting with https://",
      });
      return;
    }
    setBusy(true);
    setStatus(null);
    try {
      const res = await addUrl(value);
      setStatus({
        ok: true,
        text: `Added “${res.title}” (${res.chunks} chunk${res.chunks === 1 ? "" : "s"}).`,
      });
      setUrl("");
      onAdded();
    } catch (error) {
      setStatus({ ok: false, text: errorMessage(error) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-3">
      <label htmlFor={id} className="text-sm font-medium text-brand-ink-muted">
        Page address
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id={id}
          type="url"
          inputMode="url"
          autoComplete="url"
          spellCheck={false}
          placeholder="https://your-site.com/returns-policy"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          aria-invalid={status && !status.ok ? true : undefined}
          aria-describedby={`${id}-status ${id}-hint`}
          className={inputClass}
        />
        <button
          type="submit"
          disabled={busy || !url.trim()}
          className={clsx(primaryButtonClass, "sm:w-36")}
        >
          {busy ? (
            <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
          ) : (
            <Globe aria-hidden="true" className="h-4 w-4" />
          )}
          {busy ? "Fetching…" : "Add page"}
        </button>
      </div>
      <p id={`${id}-hint`} className="text-xs text-brand-ink-subtle">
        One public page at a time (e.g. your FAQ, shipping or refund policy).
      </p>
      <p
        id={`${id}-status`}
        role="status"
        className={clsx(
          "text-sm",
          status?.ok ? "text-primary-700" : "text-[#B42318]",
        )}
      >
        {status?.text}
      </p>
    </form>
  );
};

// ── Text ─────────────────────────────────────────────────────────────

const TextTab = ({ onAdded }: { onAdded: () => void }) => {
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(
    null,
  );
  const id = useId();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !text.trim()) {
      setStatus({ ok: false, text: "Add a title and some text." });
      return;
    }
    setBusy(true);
    setStatus(null);
    try {
      const res = await addText(title.trim(), text);
      setStatus({
        ok: true,
        text: `Added “${res.title}” (${res.chunks} chunk${res.chunks === 1 ? "" : "s"}).`,
      });
      setTitle("");
      setText("");
      onAdded();
    } catch (error) {
      setStatus({ ok: false, text: errorMessage(error) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={`${id}-title`}
          className="text-sm font-medium text-brand-ink-muted"
        >
          Title
        </label>
        <input
          id={`${id}-title`}
          value={title}
          maxLength={300}
          placeholder="e.g. Refund policy"
          onChange={(e) => setTitle(e.target.value)}
          className={inputClass}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={`${id}-text`}
          className="text-sm font-medium text-brand-ink-muted"
        >
          Text
        </label>
        <textarea
          id={`${id}-text`}
          value={text}
          rows={7}
          placeholder="Paste your policy, FAQ answers or product details…"
          onChange={(e) => setText(e.target.value)}
          className={clsx(inputClass, "resize-y")}
        />
      </div>
      <div className="flex items-center justify-between gap-3">
        <p
          id={`${id}-status`}
          role="status"
          className={clsx(
            "text-sm",
            status?.ok ? "text-primary-700" : "text-[#B42318]",
          )}
        >
          {status?.text}
        </p>
        <button type="submit" disabled={busy} className={primaryButtonClass}>
          {busy && (
            <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
          )}
          {busy ? "Adding…" : "Add text"}
        </button>
      </div>
    </form>
  );
};
