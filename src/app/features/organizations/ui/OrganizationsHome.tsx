"use client";

import { useCallback, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import { ChevronRight, Plus } from "lucide-react";
import { Container } from "@/app/features/landing/ui/primitives";
import { useToast } from "@/app/features/toast/hooks/useToast";
import { useApiErrorHandler } from "@/app/shared/hooks/useApiErrorHandler";
import { organizationsApi } from "../api/organizationsApi";
import { useResource } from "@/app/features/console/hooks/useResource";
import {
  canManage,
  ORGANIZATION_LIMITS,
  type Organization,
} from "../types/organization.types";
import { PageHeader, SignedIn } from "@/app/features/console/ui/ConsoleShell";
import {
  Avatar,
  EmptyTableRow,
  ErrorState,
  NoAccess,
  Field,
  Modal,
  Panel,
  RoleBadge,
  SkeletonRows,
  Spinner,
  buttonPrimary,
  buttonSecondary,
  formatDate,
  inputLook,
  mutedText,
  rowLook,
  tableLook,
  tdLook,
  thLook,
} from "@/app/features/console/ui/consoleUi";

export const organizationPath = (organizationId: string) =>
  `/console/organizations/${encodeURIComponent(organizationId)}`;

/** "Acme Outdoor Co." → "acme-outdoor-co" */
const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, ORGANIZATION_LIMITS.slugMax);

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** /console — the organizations you belong to, and a way to create one. */
export const OrganizationsHome = () => (
  <SignedIn
    fallback={
      <>
        <PageHeader title="Organizations" description={DESCRIPTION} />
        <Container className="py-8 sm:py-10">
          <OrganizationsTable state={{ status: "loading" }} />
        </Container>
      </>
    }
  >
    <Organizations />
  </SignedIn>
);

const DESCRIPTION =
  "Each organization holds one business’s assistant and the people who manage it.";

const Organizations = () => {
  const [creating, setCreating] = useState(false);
  const load = useCallback(
    (signal: AbortSignal) => organizationsApi.list(signal),
    [],
  );
  const { resource, retry } = useResource(load);

  return (
    <>
      <PageHeader
        title="Organizations"
        description={DESCRIPTION}
        actions={
          <button
            type="button"
            onClick={() => setCreating(true)}
            className={buttonPrimary}
          >
            <Plus aria-hidden="true" className="h-4 w-4" />
            New organization
          </button>
        }
      />

      <Container className="py-8 sm:py-10">
        {resource.status === "error" ? (
          <ErrorState
            title="Your organizations could not be loaded"
            message={resource.error.message}
            onRetry={retry}
          />
        ) : resource.status === "ready" &&
          resource.data.length > 0 &&
          !resource.data.some((o) => canManage(o.role)) ? (
          <NoAccess
            title="Organizations are managed by owners and admins"
            message="You are a member of your organizations, so there is nothing to manage here. Ask an owner if you need access."
            backHref="/console"
            backLabel="Back to overview"
          />
        ) : (
          <OrganizationsTable
            state={
              resource.status === "ready"
                ? {
                    status: "ready",
                    // Only the ones you can manage: a member can't open the rest.
                    data: resource.data.filter((o) => canManage(o.role)),
                  }
                : resource
            }
          />
        )}
      </Container>

      <CreateOrganizationModal
        open={creating}
        onClose={() => setCreating(false)}
      />
    </>
  );
};

const COLUMNS = ["", "", "hidden sm:table-cell", ""];

/** All your organizations as a table. Empty and loading keep the same columns. */
const OrganizationsTable = ({
  state,
}: {
  state: { status: "loading" } | { status: "ready"; data: Organization[] };
}) => {
  const count = state.status === "ready" ? state.data.length : null;
  return (
    <Panel className="overflow-hidden">
      <div className="flex items-baseline gap-3 px-4 py-4 sm:px-6">
        <h2 className="text-base font-semibold">Your organizations</h2>
        {count !== null && count > 0 && (
          <p className={clsx("text-sm tabular-nums", mutedText)}>{count}</p>
        )}
      </div>
      <table className={tableLook}>
        <thead>
          <tr>
            <th scope="col" className={thLook}>
              Organization
            </th>
            <th scope="col" className={thLook}>
              Your role
            </th>
            <th scope="col" className={clsx(thLook, "hidden sm:table-cell")}>
              Created
            </th>
            <th scope="col" className={clsx(thLook, "w-10")}>
              <span className="sr-only">Open</span>
            </th>
          </tr>
        </thead>
        <tbody aria-busy={state.status === "loading"}>
          {state.status === "loading" && <SkeletonRows columns={COLUMNS} />}

          {state.status === "ready" && state.data.length === 0 && (
            <EmptyTableRow colSpan={4} title="No organizations yet">
              Create your first one with{" "}
              <span className="font-medium text-brand-ink">
                New organization
              </span>{" "}
              at the top of this page.
            </EmptyTableRow>
          )}

          {state.status === "ready" &&
            state.data.map((organization, index) => (
              <tr
                key={organization.id}
                style={{ "--row": index } as React.CSSProperties}
                className={clsx(
                  "console-row-in",
                  rowLook,
                  "group relative hover:bg-brand-wash/50",
                )}
              >
                <td className={tdLook}>
                  <div className="flex items-center gap-3">
                    <Avatar
                      name={organization.name}
                      src={organization.logoUrl}
                      shape="square"
                      className="h-9 w-9 text-xs"
                    />
                    <div className="min-w-0">
                      {/* The link covers the whole row. */}
                      <Link
                        href={organizationPath(organization.id)}
                        className="block truncate font-medium after:absolute after:inset-0"
                      >
                        {organization.name}
                      </Link>
                      <p
                        className={clsx(
                          "truncate font-receipt text-xs",
                          mutedText,
                        )}
                      >
                        {organization.slug}
                      </p>
                    </div>
                  </div>
                </td>
                <td className={tdLook}>
                  <RoleBadge role={organization.role} />
                </td>
                <td
                  className={clsx(
                    tdLook,
                    "hidden whitespace-nowrap sm:table-cell",
                    mutedText,
                  )}
                >
                  {formatDate(organization.createdAt)}
                </td>
                <td className={clsx(tdLook, "w-10")}>
                  <ChevronRight
                    aria-hidden="true"
                    className="h-4 w-4 text-[#8B93A8] transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-primary-700"
                  />
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </Panel>
  );
};

type CreateErrors = { name?: string; slug?: string };

const CreateOrganizationModal = ({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) => {
  const router = useRouter();
  const { addToastMessage } = useToast();
  const handleApiError = useApiErrorHandler();
  const [name, setName] = useState("");
  /** null = follow the name; a string = the user typed their own. */
  const [customSlug, setCustomSlug] = useState<string | null>(null);
  const [errors, setErrors] = useState<CreateErrors>({});
  const [saving, setSaving] = useState(false);
  /** The slug field stays hidden until asked for: the name is enough. */
  const [editingSlug, setEditingSlug] = useState(false);

  const slug = customSlug ?? slugify(name);

  const close = () => {
    if (saving) return;
    setName("");
    setCustomSlug(null);
    setEditingSlug(false);
    setErrors({});
    onClose();
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmedName = name.trim();
    const trimmedSlug = slug.trim();

    const found: CreateErrors = {};
    if (!trimmedName) found.name = "Enter a name.";
    if (trimmedSlug && !SLUG_PATTERN.test(trimmedSlug)) {
      found.slug = "Use lowercase letters, numbers and single hyphens.";
    }
    setErrors(found);
    if (found.slug) setEditingSlug(true);
    if (found.name || found.slug) return;

    setSaving(true);
    try {
      const created = await organizationsApi.create({
        name: trimmedName,
        slug: trimmedSlug || null,
      });
      addToastMessage("success", `${trimmedName} was created.`);
      setSaving(false);
      setName("");
      setCustomSlug(null);
      onClose();
      router.push(organizationPath(created.id));
    } catch (error) {
      handleApiError(error, {
        onFieldErrors: (fields) => {
          setErrors(fields);
          if (fields.slug) setEditingSlug(true);
        },
        // A taken slug comes back as 409: let the user pick another.
        onStatus: { 409: () => void setEditingSlug(true) },
      });
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="New organization"
      description="Name it after your business. You can invite your team next."
    >
      <form onSubmit={submit} noValidate className="flex flex-col gap-5">
        <Field label="Name" htmlFor="organization-name" error={errors.name}>
          <input
            id="organization-name"
            name="name"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setErrors((current) => ({ ...current, name: undefined }));
            }}
            maxLength={ORGANIZATION_LIMITS.nameMax}
            placeholder="Acme Outdoor Co."
            autoComplete="organization"
            autoFocus
            required
            aria-invalid={Boolean(errors.name)}
            aria-describedby={
              errors.name ? "organization-name-error" : undefined
            }
            className={inputLook}
          />
        </Field>

        {!editingSlug ? (
          <p className={clsx("-mt-2 text-xs", mutedText)}>
            {slug ? (
              <>
                Slug:{" "}
                <span className="font-receipt text-brand-ink">{slug}</span>
                {" · "}
              </>
            ) : null}
            <button
              type="button"
              onClick={() => setEditingSlug(true)}
              className="font-medium text-primary-700 underline decoration-current/30 underline-offset-4 hover:decoration-current"
            >
              {slug ? "Change" : "Set a custom slug"}
            </button>
          </p>
        ) : (
          <Field
            label="Slug"
            htmlFor="organization-slug"
            optional
            error={errors.slug}
            hint="A short identifier: lowercase letters, numbers and hyphens."
          >
            <input
              id="organization-slug"
              name="slug"
              value={slug}
              onChange={(event) => {
                setCustomSlug(event.target.value);
                setErrors((current) => ({ ...current, slug: undefined }));
              }}
              maxLength={ORGANIZATION_LIMITS.slugMax}
              placeholder="acme-outdoor-co"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              aria-invalid={Boolean(errors.slug)}
              aria-describedby={
                errors.slug
                  ? "organization-slug-error"
                  : "organization-slug-hint"
              }
              className={clsx(inputLook, "font-receipt")}
            />
          </Field>
        )}

        <div className="mt-1 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={close}
            disabled={saving}
            className={buttonSecondary}
          >
            Cancel
          </button>
          <button type="submit" disabled={saving} className={buttonPrimary}>
            {saving && <Spinner />}
            {saving ? "Creating…" : "Create organization"}
          </button>
        </div>
      </form>
    </Modal>
  );
};
