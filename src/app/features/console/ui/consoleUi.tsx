"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { clsx } from "clsx";
import { Info, Loader2, Search, X } from "lucide-react";
import { primaryButtonLook } from "@/app/features/landing/ui/primitives";
import {
  roleLabel,
  type OrganizationRole,
} from "@/app/features/organizations/types/organization.types";

/* ────────────────────────────────────────────────────────────
 * Building blocks for the console (/console).
 *
 * Same palette as the marketing page: white and the teal wash for surfaces,
 * teal as the one action colour, navy for text only.
 * ──────────────────────────────────────────────────────────── */

export const mutedText = "text-[#4B5468]";

const disabledLook = "disabled:pointer-events-none disabled:opacity-60";

export const buttonPrimary = `${primaryButtonLook} h-10 gap-2 px-4 text-sm ${disabledLook}`;

export const buttonSecondary = `inline-flex h-10 items-center justify-center gap-2 rounded-md border border-brand-ink/15 bg-white px-4 text-sm font-medium text-brand-ink transition-colors duration-150 hover:border-brand-ink/30 hover:bg-brand-wash ${disabledLook}`;

export const buttonDanger = `inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#D92D20]/30 bg-white px-4 text-sm font-medium text-[#B42318] transition-colors duration-150 hover:bg-[#FEF3F2] ${disabledLook}`;

export const inputLook =
  "h-10 w-full rounded-md border border-brand-ink/15 bg-white px-3 text-sm text-brand-ink placeholder:text-[#8B93A8] transition-[border-color,box-shadow] duration-150 focus:border-primary-700 focus:outline-none focus:ring-3 focus:ring-brand-teal/25 disabled:bg-brand-mist disabled:text-[#4B5468] aria-[invalid=true]:border-[#D92D20]";

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
        className="text-xs text-[#B42318]"
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
  className = "h-9 w-9 text-xs",
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
        shape === "round" ? "rounded-full" : "rounded-lg",
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

/** Weight follows power: Owner filled, Admin tinted, Member outlined. */
export const RoleBadge = ({ role }: { role: OrganizationRole }) => (
  <span
    className={clsx(
      "inline-flex h-6 items-center rounded-[4px] px-2 text-xs font-medium whitespace-nowrap",
      role === 0 && "bg-primary-700 text-white",
      role === 1 && "bg-primary-100 text-primary-800",
      role !== 0 && role !== 1 && "border border-brand-ink/20 text-[#4B5468]",
    )}
  >
    {roleLabel(role)}
  </span>
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
      className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#6B7385]"
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

/** A quiet note that explains why something is read-only or limited. */
export const Notice = ({ children }: { children: ReactNode }) => (
  <p className="flex items-start gap-2.5 rounded-lg border border-brand-ink/10 bg-brand-mist px-4 py-3 text-sm text-[#4B5468]">
    <Info
      aria-hidden="true"
      className="mt-0.5 h-4 w-4 shrink-0 text-primary-700"
    />
    <span>{children}</span>
  </p>
);

/* ─── Tables ─────────────────────────────────────────────────────── */

export const tableLook = "w-full border-collapse text-left text-sm";
export const thLook =
  "border-b border-brand-ink/10 bg-brand-mist/70 px-4 py-2.5 text-xs font-medium whitespace-nowrap text-[#4B5468] sm:px-6";
export const tdLook = "px-4 py-3.5 align-middle sm:px-6";
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
    <td colSpan={colSpan} className="px-6 py-12 text-center">
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
      "rounded-xl border border-brand-ink/10 bg-white",
      className,
    )}
  >
    {children}
  </div>
);

/**
 * An unboxed side note: one heavy rule, a serif title, then plain rows. It
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
      className="border-t-2 border-brand-ink pt-3"
    >
      <div className="flex items-baseline justify-between gap-4">
        <h2
          id={titleId}
          className="font-display text-[22px] leading-tight tracking-[-0.01em]"
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
      "block animate-pulse rounded bg-brand-ink/[0.07] motion-reduce:animate-none",
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
  <Panel className="px-6 py-12 text-center">
    <h2 className="text-base font-semibold text-brand-ink">{title}</h2>
    <p className={clsx("mx-auto mt-1.5 max-w-md text-sm", mutedText)}>
      {message}
    </p>
    <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
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
      className="m-auto w-[min(100%-2rem,480px)] rounded-xl border border-brand-ink/10 bg-white p-0 text-brand-ink shadow-[0_24px_48px_-24px_rgba(18,23,42,0.45)] backdrop:bg-black/35"
    >
      {open && (
        <div className="p-6 sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2
                id={titleId}
                className="font-display text-2xl leading-tight tracking-[-0.01em]"
              >
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
              className="-mt-1 -mr-2 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-[#4B5468] transition-colors hover:bg-brand-wash hover:text-brand-ink"
            >
              <X aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-6">{children}</div>
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
