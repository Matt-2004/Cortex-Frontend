"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { clsx } from "clsx";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Copy,
  Info,
  Loader2,
  Search,
  X,
} from "lucide-react";
import { primaryButtonLook } from "@/app/features/landing/ui/primitives";
import {
  ADMIN,
  OWNER,
  roleLabel,
  type OrganizationRole,
} from "@/app/features/organizations/types/organization.types";

/* ────────────────────────────────────────────────────────────
 * Building blocks for the console (/console).
 *
 * The console is an information tool, so it is compact: 36px controls,
 * 40px table rows, sans-serif headings. Colour has one meaning each:
 *   teal      the action and the brand accent (primary button, links, Owner)
 *   blue      informational (Admin, notices)
 *   green     done / healthy (Active, success)
 *   amber     needs attention (Pending, warnings)
 *   red       destructive or failed (Remove, Past due, errors)
 *   grey      everything else
 * Status colours come from the --status-* tokens in globals.css.
 * ──────────────────────────────────────────────────────────── */

export const mutedText = "text-brand-ink-muted";

// Every console button sinks 1px while pressed, so a click is felt.
const disabledLook =
  "active:translate-y-px motion-reduce:active:translate-y-0 disabled:pointer-events-none disabled:opacity-60";

export const buttonPrimary = `${primaryButtonLook} h-9 gap-2 px-3.5 text-sm ${disabledLook}`;

export const buttonSecondary = `inline-flex h-9 items-center justify-center gap-2 rounded-control border border-brand-ink/15 bg-white px-3.5 text-sm font-medium text-brand-ink transition-colors duration-150 hover:border-brand-ink/30 hover:bg-brand-wash ${disabledLook}`;

export const buttonDanger = `inline-flex h-9 items-center justify-center gap-2 rounded-control border border-status-error-border bg-white px-3.5 text-sm font-medium text-status-error-text transition-colors duration-150 hover:bg-status-error-bg ${disabledLook}`;

/** A small borderless button for row actions (Revoke, Copy). */
export const buttonGhost = `inline-flex h-8 items-center justify-center gap-1.5 rounded-control px-2.5 text-sm font-medium text-brand-ink-muted transition-colors duration-150 hover:bg-brand-wash hover:text-brand-ink ${disabledLook}`;

export const inputLook =
  "h-9 w-full rounded-control border border-brand-ink/15 bg-white px-3 text-sm text-brand-ink placeholder:text-brand-ink-faint transition-[border-color,box-shadow] duration-150 focus:border-primary-700 focus:outline-none focus:ring-3 focus:ring-brand-teal/25 disabled:bg-brand-mist disabled:text-brand-ink-muted aria-[invalid=true]:border-status-error";

/** Spinner shown inside a button while its action runs. */
export const Spinner = ({ className }: { className?: string }) => (
  <Loader2
    aria-hidden="true"
    className={clsx("h-4 w-4 animate-spin", className)}
  />
);

/** A label, its control, and a hint or an error underneath. */
export const Field = ({
  label,
  htmlFor,
  hint,
  error,
  optional,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: ReactNode;
  error?: string;
  optional?: boolean;
  children: ReactNode;
}) => (
  <div className="flex flex-col gap-1.5">
    <label htmlFor={htmlFor} className="text-sm font-medium text-brand-ink">
      {label}
      {optional && (
        <span className={clsx("ml-1.5 font-normal", mutedText)}>optional</span>
      )}
    </label>
    {children}
    {error ? (
      <p
        id={`${htmlFor}-error`}
        role="alert"
        className="text-xs text-status-error-text"
      >
        {error}
      </p>
    ) : (
      hint && (
        <p id={`${htmlFor}-hint`} className={clsx("text-xs", mutedText)}>
          {hint}
        </p>
      )
    )}
  </div>
);

const initialsOf = (name: string) => {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  const letters =
    words.length === 1
      ? words[0].slice(0, 2)
      : `${words[0][0]}${words[words.length - 1][0]}`;
  return letters.toUpperCase();
};

/**
 * A person (round) or an organization (rounded square). Shows the image when
 * there is one and it loads; otherwise initials on the teal wash.
 */
export const Avatar = ({
  name,
  src,
  shape = "round",
  className = "h-8 w-8 text-[11px]",
}: {
  name: string;
  src?: string | null;
  shape?: "round" | "square";
  className?: string;
}) => {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const showImage = Boolean(src) && failedSrc !== src;

  return (
    <span
      aria-hidden="true"
      className={clsx(
        "inline-flex shrink-0 items-center justify-center overflow-hidden bg-brand-wash font-semibold text-primary-800",
        shape === "round" ? "rounded-full" : "rounded-box",
        className,
      )}
    >
      {showImage ? (
        // The URL is whatever the customer saved, on any host, so next/image
        // (which needs each host allow-listed) does not fit here.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src ?? undefined}
          alt=""
          referrerPolicy="no-referrer"
          onError={() => setFailedSrc(src ?? null)}
          className="h-full w-full object-cover"
        />
      ) : (
        initialsOf(name)
      )}
    </span>
  );
};

export type BadgeTone =
  "neutral" | "accent" | "info" | "success" | "warning" | "danger";

const BADGE_TONES: Record<BadgeTone, string> = {
  neutral: "border-brand-ink/15 bg-white text-brand-ink-muted",
  accent: "border-brand-teal/30 bg-brand-teal/10 text-primary-700",
  info: "border-status-info-border bg-status-info-bg text-status-info-text",
  success:
    "border-status-success-border bg-status-success-bg text-status-success-text",
  warning:
    "border-status-warning-border bg-status-warning-bg text-status-warning-text",
  danger:
    "border-status-error-border bg-status-error-bg text-status-error-text",
};

/** The one badge shape in the console; the tone carries the meaning. */
export const Badge = ({
  tone = "neutral",
  children,
  className,
}: {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}) => (
  <span
    className={clsx(
      "inline-flex h-5 items-center rounded-badge border px-1.5 text-xs font-medium whitespace-nowrap",
      BADGE_TONES[tone],
      className,
    )}
  >
    {children}
  </span>
);

/** Owner in the brand teal, Admin in blue, Member in grey. */
export const roleTone = (role: OrganizationRole): BadgeTone =>
  role === OWNER ? "accent" : role === ADMIN ? "info" : "neutral";

export const RoleBadge = ({ role }: { role: OrganizationRole }) => (
  <Badge tone={roleTone(role)}>{roleLabel(role)}</Badge>
);

/** Search box for filtering a list in place. */
export const SearchInput = ({
  label,
  placeholder,
  value,
  onChange,
  className,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) => (
  <div className={clsx("relative w-full sm:w-64", className)}>
    <Search
      aria-hidden="true"
      className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-brand-ink-subtle"
    />
    <input
      type="search"
      aria-label={label}
      placeholder={placeholder}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={clsx(inputLook, "h-9 pl-9")}
    />
  </div>
);

const NOTICE_TONES = {
  info: "border-status-info-border bg-status-info-bg text-status-info-text",
  success:
    "border-status-success-border bg-status-success-bg text-status-success-text",
  warning:
    "border-status-warning-border bg-status-warning-bg text-status-warning-text",
} as const;

const NOTICE_ICONS = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
};

/** A one-line note: why something is read-only, or what just happened. */
export const Notice = ({
  tone = "info",
  children,
}: {
  tone?: keyof typeof NOTICE_TONES;
  children: ReactNode;
}) => {
  const Icon = NOTICE_ICONS[tone];
  return (
    <div
      className={clsx(
        "flex items-start gap-2.5 rounded-box border px-3.5 py-2.5 text-sm",
        NOTICE_TONES[tone],
      )}
    >
      <Icon aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
};

/* ─── Tables ─────────────────────────────────────────────────────── */

export const tableLook = "w-full border-collapse text-left text-sm";
export const thLook =
  "h-9 border-b border-brand-ink/10 bg-brand-mist/70 px-4 text-xs font-medium whitespace-nowrap text-brand-ink-muted";
export const tdLook = "px-4 py-2 align-middle";
export const rowLook =
  "border-b border-brand-ink/10 last:border-b-0 transition-colors duration-150";

/** The single row of an empty table: the headers stay, so the shape is clear. */
export const EmptyTableRow = ({
  colSpan,
  title,
  children,
}: {
  colSpan: number;
  title: string;
  children?: ReactNode;
}) => (
  <tr>
    <td colSpan={colSpan} className="px-4 py-10 text-center">
      <p className="text-sm font-medium text-brand-ink">{title}</p>
      {children && (
        <div className={clsx("mx-auto mt-1 max-w-sm text-sm", mutedText)}>
          {children}
        </div>
      )}
    </td>
  </tr>
);

/** Placeholder rows that keep the table's columns while data loads. */
export const SkeletonRows = ({
  columns,
  rows = 3,
}: {
  columns: string[];
  rows?: number;
}) => (
  <>
    {Array.from({ length: rows }, (_, row) => (
      <tr key={row} aria-hidden="true" className={rowLook}>
        {columns.map((cell, index) => (
          <td key={index} className={clsx(tdLook, cell)}>
            <Skeleton
              className={index === 0 ? "h-4 w-40 max-w-full" : "h-4 w-16"}
            />
          </td>
        ))}
      </tr>
    ))}
  </>
);

/** Bordered white surface: lists, forms, tables. */
export const Panel = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => (
  <div
    className={clsx(
      "rounded-card border border-brand-ink/10 bg-white",
      className,
    )}
  >
    {children}
  </div>
);

/** The title bar of a Panel: a title (and count) left, actions right. */
export const PanelHeader = ({
  title,
  count,
  description,
  actions,
  id,
}: {
  title: string;
  count?: number | null;
  description?: ReactNode;
  actions?: ReactNode;
  /** For aria-labelledby on the section the header names. */
  id?: string;
}) => (
  <div className="flex min-h-12 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-brand-ink/10 px-4 py-2.5">
    <div className="min-w-0">
      <h2 id={id} className="text-sm font-semibold text-brand-ink">
        {title}
        {count !== undefined && count !== null && (
          <span className={clsx("ml-2 font-normal tabular-nums", mutedText)}>
            {count.toLocaleString()}
          </span>
        )}
      </h2>
      {description && (
        <p className={clsx("mt-0.5 text-xs", mutedText)}>{description}</p>
      )}
    </div>
    {actions && (
      <div className="flex flex-wrap items-center gap-2">{actions}</div>
    )}
  </div>
);

/** Label-left, value-right rows for read-only facts (IDs, dates). */
export const DetailList = ({ children }: { children: ReactNode }) => (
  <dl className="divide-y divide-brand-ink/10 text-sm">{children}</dl>
);

export const DetailRow = ({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) => (
  <div className="grid gap-1 px-4 py-2.5 sm:grid-cols-[10rem_minmax(0,1fr)] sm:items-center sm:gap-4">
    <dt className={mutedText}>{label}</dt>
    <dd className="min-w-0 text-brand-ink">{children}</dd>
  </div>
);

/** A monospace value (an ID) with a button that copies it. */
export const CopyValue = ({
  value,
  label,
}: {
  value: string;
  label: string;
}) => {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard blocked (permissions, insecure origin): the value is
      // still on screen to select by hand.
    }
  };

  return (
    <span className="flex min-w-0 items-center gap-1">
      <span
        translate="no"
        className="min-w-0 truncate font-receipt text-[13px]"
        title={value}
      >
        {value}
      </span>
      <button
        type="button"
        onClick={copy}
        aria-label={copied ? "Copied" : `Copy ${label}`}
        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-control text-brand-ink-muted transition-colors duration-150 hover:bg-brand-wash hover:text-brand-ink"
      >
        {copied ? (
          <Check aria-hidden="true" className="h-3.5 w-3.5 text-primary-700" />
        ) : (
          <Copy aria-hidden="true" className="h-3.5 w-3.5" />
        )}
      </button>
    </span>
  );
};

/**
 * A side note on a white card: a title, then plain rows. It
 * sits beside a Panel so a screen is not a grid of equal-weight cards — the
 * Panel carries the main list, the note carries what supports it.
 */
export const SideNote = ({
  title,
  meta,
  children,
}: {
  title: string;
  /** Shown opposite the title: a count or a link. */
  meta?: ReactNode;
  children: ReactNode;
}) => {
  const titleId = useId();
  return (
    <section
      aria-labelledby={titleId}
      className="rounded-card border border-brand-ink/10 bg-white px-5 pt-4 pb-2"
    >
      <div className="flex items-baseline justify-between gap-4">
        <h2
          id={titleId}
          className="font-display font-heading text-[22px] leading-tight tracking-[-0.01em]"
        >
          {title}
        </h2>
        {meta}
      </div>
      {children}
    </section>
  );
};

/** Text link used inside panels and side notes. */
export const textLink =
  "font-medium text-primary-700 underline decoration-primary-700/30 underline-offset-4 transition-colors duration-150 hover:decoration-primary-700";

export const Skeleton = ({ className }: { className?: string }) => (
  <span
    aria-hidden="true"
    className={clsx(
      "block animate-pulse rounded-badge bg-brand-ink/[0.07] motion-reduce:animate-none",
      className,
    )}
  />
);

/** For pages a member's role doesn't open. */
export const NoAccess = ({
  title,
  message,
  backHref,
  backLabel,
}: {
  title: string;
  message: string;
  backHref: string;
  backLabel: string;
}) => (
  <ErrorState title={title} message={message}>
    <a href={backHref} className={buttonSecondary}>
      {backLabel}
    </a>
  </ErrorState>
);

/** Shown when a screen's data could not be loaded. */
export const ErrorState = ({
  title,
  message,
  onRetry,
  children,
}: {
  title: string;
  message: string;
  onRetry?: () => void;
  children?: ReactNode;
}) => (
  <Panel className="px-6 py-10 text-center">
    <h2 className="text-sm font-semibold text-brand-ink">{title}</h2>
    <p className={clsx("mx-auto mt-1.5 max-w-md text-sm", mutedText)}>
      {message}
    </p>
    <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
      {onRetry && (
        <button type="button" onClick={onRetry} className={buttonSecondary}>
          Try again
        </button>
      )}
      {children}
    </div>
  </Panel>
);

/**
 * A modal dialog on the native <dialog>: the browser handles the focus trap,
 * Escape and the inert page behind it.
 */
export const Modal = ({
  open,
  onClose,
  title,
  description,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children: ReactNode;
}) => {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => {
        // A click on the backdrop lands on the <dialog> element itself.
        if (event.target === ref.current) onClose();
      }}
      className="m-auto w-[min(100%-2rem,440px)] rounded-card border border-brand-ink/10 bg-white p-0 text-brand-ink shadow-[0_24px_48px_-24px_rgba(18,23,42,0.45)] overscroll-contain backdrop:bg-black/35"
    >
      {open && (
        <div className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id={titleId} className="text-lg leading-tight font-semibold">
                {title}
              </h2>
              {description && (
                <p className={clsx("mt-1.5 text-sm", mutedText)}>
                  {description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="-mt-1.5 -mr-1.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-control text-brand-ink-muted transition-colors hover:bg-brand-wash hover:text-brand-ink"
            >
              <X aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-5">{children}</div>
        </div>
      )}
    </dialog>
  );
};

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });

/** "12 Nov 2026" in the visitor's locale; "—" when missing or unreadable. */
export const formatDate = (iso: string | null) => {
  if (!iso) return "—";
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "—" : dateFormat.format(date);
};
