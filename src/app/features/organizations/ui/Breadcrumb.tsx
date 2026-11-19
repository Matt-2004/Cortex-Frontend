import Link from "next/link";

const linkLook =
  "underline decoration-current/30 underline-offset-4 transition-colors hover:text-brand-ink";

/** Organizations / {organization} / {current}: every part but the last links. */
export const OrganizationBreadcrumb = ({
  trail = [],
  current,
}: {
  /** Parent pages after "Organizations", in order. */
  trail?: { label: string; href: string }[];
  current?: string;
}) => (
  <nav aria-label="Breadcrumb">
    <ol className="flex flex-wrap items-center gap-1.5">
      <li>
        <Link href="/console/organizations" className={linkLook}>
          Organizations
        </Link>
      </li>
      {trail.map((step) => (
        <li key={step.href} className="flex items-center gap-1.5">
          <span aria-hidden="true">/</span>
          <Link href={step.href} className={linkLook}>
            {step.label}
          </Link>
        </li>
      ))}
      {current && (
        <li className="flex min-w-0 items-center gap-1.5">
          <span aria-hidden="true">/</span>
          <span aria-current="page" className="truncate text-brand-ink">
            {current}
          </span>
        </li>
      )}
    </ol>
  </nav>
);
