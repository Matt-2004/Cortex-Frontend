"use client";

import { useId, useState, type ReactNode } from "react";
import { clsx } from "clsx";
import { Globe, Loader2, Type, UploadCloud } from "lucide-react";
import { addText, addUrl, AiApiError } from "../api/aiApi";

type Tab = "upload" | "url" | "text";

const errorMessage = (error: unknown) =>
  error instanceof AiApiError
    ? error.message
    : "Something went wrong. Please try again.";

const inputClass =
  "w-full rounded-control border border-brand-ink/15 bg-white px-3 py-2.5 text-sm text-brand-ink placeholder:text-brand-ink-subtle focus:border-primary-700 focus:shadow-[0_0_0_3px_rgba(0,171,143,0.22)] focus:outline-none";

const primaryButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-control bg-brand-teal px-4 py-2.5 text-sm font-semibold text-brand-ink transition-colors hover:bg-primary-400 disabled:cursor-not-allowed disabled:opacity-50";

/**
 * Upload files goes to the Cortex backend (documents of an organization) and
 * comes in as `uploadTab`; Web page and Paste text still go to the AI service.
 */
export const AddContentPanel = ({
  onAdded,
  uploadTab,
}: {
  /** After a web page or text was added to the AI service. */
  onAdded: () => void;
  uploadTab: ReactNode;
}) => {
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

      {/* Hidden, not unmounted, on the other tabs: unmounting would cancel
          the uploads in progress. */}
      <div
        role="tabpanel"
        id={`${tabsId}-panel-upload`}
        aria-labelledby={`${tabsId}-tab-upload`}
        hidden={tab !== "upload"}
        className="p-5"
      >
        {uploadTab}
      </div>
      {tab !== "upload" && (
        <div
          role="tabpanel"
          id={`${tabsId}-panel-${tab}`}
          aria-labelledby={`${tabsId}-tab-${tab}`}
          className="p-5"
        >
          {tab === "url" && <UrlTab onAdded={onAdded} />}
          {tab === "text" && <TextTab onAdded={onAdded} />}
        </div>
      )}
    </section>
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
