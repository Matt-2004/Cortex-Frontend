"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
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
  ORGANIZATION_ROLES,
  type Organization,
  type OrganizationMember,
} from "../types/organization.types";
import {
  PageHeader,
  SignedIn,
  useOrganizationAccess,
} from "@/app/features/console/ui/ConsoleShell";
import {
  Avatar,
  EmptyTableRow,
  ErrorState,
  NoAccess,
  Field,
  Modal,
  Panel,
  RoleBadge,
  SideNote,
  Skeleton,
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

/**
 * /console/organizations — every organization you belong to, and a way to
 * create one. The table is the page: the ones you manage open on click and
 * show who is in them; the ones where you are only a member are listed too,
 * unlinked, so the list is complete. Beside it, unboxed, sits what explains
 * the "Your role" column.
 */
export const OrganizationsHome = () => (
  <SignedIn
    fallback={
      <>
        <PageHeader title="Organizations" description={DESCRIPTION} />
        <OrganizationsLayout state={{ status: "loading" }} />
      </>
    }
  >
    <Organizations />
  </SignedIn>
);

const DESCRIPTION =
  "Each organization holds one business’s assistant and the people who manage it.";

const count = (n: number) => `${n} organization${n === 1 ? "" : "s"}`;

/** The header's one hard fact, once the list is known. */
const summary = (organizations: Organization[]) => {
  const managed = organizations.filter((o) => canManage(o.role)).length;
  const member = organizations.length - managed;
  if (managed === 0) return DESCRIPTION;
  return member > 0
    ? `You manage ${count(managed)} and are a member of ${member} more.`
    : `You manage ${count(managed)}. Each one holds a business’s assistant and its team.`;
};

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
        description={
          resource.status === "ready" ? summary(resource.data) : DESCRIPTION
        }
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

      {resource.status === "error" ? (
        <Container className="py-8 sm:py-10">
          <ErrorState
            title="Your organizations could not be loaded"
            message={resource.error.message}
            onRetry={retry}
          />
        </Container>
      ) : resource.status === "ready" &&
        resource.data.length > 0 &&
        !resource.data.some((o) => canManage(o.role)) ? (
        <Container className="py-8 sm:py-10">
          <NoAccess
            title="Organizations are managed by owners and admins"
            message="You are a member of your organizations, so there is nothing to manage here. Ask an owner if you need access."
            backHref="/console"
            backLabel="Back to overview"
          />
        </Container>
      ) : (
        <OrganizationsLayout
          state={
            resource.status === "ready"
              ? {
                  status: "ready",
                  // The ones you can open come first.
                  data: [
                    ...resource.data.filter((o) => canManage(o.role)),
                    ...resource.data.filter((o) => !canManage(o.role)),
                  ],
                }
              : resource
          }
        />
      )}

      <CreateOrganizationModal
        open={creating}
        onClose={() => setCreating(false)}
      />
    </>
  );
};

type TableState =
  { status: "loading" } | { status: "ready"; data: Organization[] };

/**
 * The table, and the note beside it once the content column is wide enough
 * (a container query: the sidebar takes 256px of the viewport from `lg` up).
 */
const OrganizationsLayout = ({ state }: { state: TableState }) => (
  <Container className="pt-8 pb-12 sm:pt-10">
    <div className="@container">
      <div className="grid items-start gap-x-12 gap-y-10 @4xl:grid-cols-[minmax(0,1fr)_minmax(0,19rem)]">
        <OrganizationsTable state={state} />
        <aside aria-label="About roles" className="min-w-0">
          <SideNote title="What each role can do">
            <dl className="mt-2 divide-y divide-brand-ink/10">
              {ORGANIZATION_ROLES.map((role) => (
                <div key={role.value} className="flex items-start gap-3 py-3">
                  <dt className="w-[4.5rem] shrink-0">
                    <RoleBadge role={role.value} />
                  </dt>
                  <dd className={clsx("text-sm", mutedText)}>
                    {role.description}
                  </dd>
                </div>
              ))}
            </dl>
          </SideNote>
        </aside>
      </div>
    </div>
  </Container>
);

/** Who is in each organization: a list, "error", or absent while loading. */
type People = Record<string, OrganizationMember[] | "error">;

/** Beyond this many rows the table stops asking who is in each one. */
const PEOPLE_ROWS = 12;

/**
 * The members of each organization the user manages, one request per row.
 * A row that fails shows "—": the count is a convenience, not the page.
 */
const usePeople = (organizationIds: string[]) => {
  const key = organizationIds.slice(0, PEOPLE_ROWS).join(",");
  const [people, setPeople] = useState<People>({});

  useEffect(() => {
    if (!key) return;
    const controller = new AbortController();
    for (const id of key.split(",")) {
      organizationsApi
        .members(id, controller.signal)
        .then((members) => setPeople((all) => ({ ...all, [id]: members })))
        .catch(() => {
          if (!controller.signal.aborted) {
            setPeople((all) => ({ ...all, [id]: "error" }));
          }
        });
    }
    return () => controller.abort();
  }, [key]);

  return people;
};

const FACES = 3;

/** Up to three faces, overlapped, and the head count. */
const PeopleCell = ({ members }: { members: People[string] | undefined }) => {
  if (members === undefined) return <Skeleton className="h-4 w-16" />;
  if (members === "error") {
    return (
      <span className={mutedText}>
        <span aria-hidden="true">—</span>
        <span className="sr-only">Unknown</span>
      </span>
    );
  }
  return (
    <span className="flex items-center gap-2.5">
      <span className="flex -space-x-1">
        {members.slice(0, FACES).map((member, index) => (
          // Earlier faces sit on top, so their initials stay whole.
          <span
            key={member.userId}
            className="relative flex"
            style={{ zIndex: FACES - index }}
          >
            <Avatar
              name={member.name || member.email}
              src={member.avatarUrl}
              className="h-7 w-7 text-[10px] ring-2 ring-white"
            />
          </span>
        ))}
      </span>
      <span className={clsx("whitespace-nowrap tabular-nums", mutedText)}>
        {members.length.toLocaleString()}
        <span className="sr-only">
          {members.length === 1 ? " person" : " people"}
        </span>
      </span>
    </span>
  );
};

const COLUMNS = ["", "hidden @2xl:table-cell", "", "hidden sm:table-cell", ""];

/** Your organizations. Empty and loading keep the same columns. */
const OrganizationsTable = ({ state }: { state: TableState }) => {
  const organizations = state.status === "ready" ? state.data : [];
  const people = usePeople(
    organizations.filter((o) => canManage(o.role)).map((o) => o.id),
  );

  return (
    <Panel className="min-w-0 overflow-hidden">
      <table className={tableLook}>
        <caption className="sr-only">Your organizations</caption>
        <thead>
          <tr>
            <th scope="col" className={clsx(thLook, "w-full")}>
              Organization
            </th>
            <th scope="col" className={clsx(thLook, "hidden @2xl:table-cell")}>
              People
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

          {state.status === "ready" && organizations.length === 0 && (
            <EmptyTableRow colSpan={5} title="No organizations yet">
              Create your first one with{" "}
              <span className="font-medium text-brand-ink">
                New organization
              </span>{" "}
              at the top of this page.
            </EmptyTableRow>
          )}

          {organizations.map((organization, index) => {
            const manageable = canManage(organization.role);
            return (
              <tr
                key={organization.id}
                style={{ "--row": index } as React.CSSProperties}
                className={clsx(
                  "console-row-in",
                  rowLook,
                  manageable &&
                    "group relative hover:bg-brand-wash/50 has-[a:focus-visible]:bg-brand-wash/50",
                )}
              >
                {/* max-w-0 lets the name truncate instead of widening the table. */}
                <td className={clsx(tdLook, "w-full max-w-0")}>
                  <div className="flex items-center gap-3">
                    <Avatar
                      name={organization.name}
                      src={organization.logoUrl}
                      shape="square"
                      className={clsx(
                        "h-9 w-9 text-xs",
                        !manageable && "bg-brand-mist text-[#4B5468]",
                      )}
                    />
                    <div className="min-w-0">
                      {manageable ? (
                        // The link covers the whole row, and so does its
                        // focus ring.
                        <Link
                          href={organizationPath(organization.id)}
                          className="block truncate font-medium after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-brand-teal"
                        >
                          {organization.name}
                        </Link>
                      ) : (
                        <p className="truncate font-medium">
                          {organization.name}
                        </p>
                      )}
                      {manageable ? (
                        <p
                          translate="no"
                          className={clsx(
                            "truncate font-receipt text-xs",
                            mutedText,
                          )}
                        >
                          {organization.slug}
                        </p>
                      ) : (
                        <p className={clsx("text-xs", mutedText)}>
                          Managed by its owners and admins
                        </p>
                      )}
                    </div>
                  </div>
                </td>
                <td className={clsx(tdLook, "hidden @2xl:table-cell")}>
                  {manageable &&
                    (index < PEOPLE_ROWS ? (
                      <PeopleCell members={people[organization.id]} />
                    ) : (
                      <PeopleCell members="error" />
                    ))}
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
                  {manageable && (
                    <ChevronRight
                      aria-hidden="true"
                      className="h-4 w-4 text-[#8B93A8] transition-[translate,color] duration-150 group-hover:translate-x-[3px] group-hover:text-primary-700 motion-reduce:transition-none"
                    />
                  )}
                </td>
              </tr>
            );
          })}
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
  const { refresh: refreshAccess } = useOrganizationAccess();
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
      // A first organization can open the Organizations area in the sidebar.
      await refreshAccess();
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
