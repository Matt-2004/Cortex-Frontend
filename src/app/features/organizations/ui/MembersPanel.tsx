"use client";

import { useCallback, useState, type FormEvent } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import { ChevronRight, UserPlus } from "lucide-react";
import { useToast } from "@/app/features/toast/hooks/useToast";
import { useApiErrorHandler } from "@/app/shared/hooks/useApiErrorHandler";
import { organizationsApi } from "../api/organizationsApi";
import { useResource } from "@/app/features/console/hooks/useResource";
import {
  ADMIN,
  DEFAULT_MEMBER_ROLE,
  ORGANIZATION_LIMITS,
  ORGANIZATION_ROLES,
  OWNER,
  assignableRoles,
  canManage,
  roleLabel,
  type OrganizationMember,
  type OrganizationRole,
} from "../types/organization.types";
import { useConsoleUser } from "@/app/features/console/ui/ConsoleShell";
import {
  Avatar,
  ErrorState,
  Field,
  Modal,
  Notice,
  Panel,
  SearchInput,
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

/** Show a search box once the list is longer than this. */
const SEARCH_FROM = 5;

const MEMBER_COLUMNS = ["", "hidden md:table-cell", "w-10"];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const selectLook = clsx(inputLook, "pr-8");

export const displayName = (member: OrganizationMember) =>
  member.name.trim() || member.email;

export const memberPath = (organizationId: string, memberUserId: string) =>
  `/console/organizations/${encodeURIComponent(organizationId)}/members/${encodeURIComponent(memberUserId)}`;

/**
 * The Members tab: who is in the organization. The table is read-only;
 * a row opens the member's own page, where their role is changed or they are
 * removed.
 */
export const MembersPanel = ({
  organizationId,
  organizationName,
  viewerRole,
}: {
  organizationId: string;
  organizationName: string;
  /** The signed-in user's role here: decides what they may add. */
  viewerRole: OrganizationRole;
}) => {
  const user = useConsoleUser();
  const manageable = canManage(viewerRole);

  const load = useCallback(
    (signal: AbortSignal) => organizationsApi.members(organizationId, signal),
    [organizationId],
  );
  const { resource, reload, retry } = useResource(load);

  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const needle = query.trim().toLowerCase();
  const total = resource.status === "ready" ? resource.data.length : null;
  const visible =
    resource.status === "ready"
      ? resource.data.filter(
          (member) =>
            !needle ||
            member.name.toLowerCase().includes(needle) ||
            member.email.toLowerCase().includes(needle),
        )
      : [];

  const isSelf = (member: OrganizationMember) =>
    member.userId === user.id ||
    member.email.toLowerCase() === user.email.toLowerCase();

  return (
    <div className="flex flex-col gap-6">
      {!manageable && (
        <Notice>
          You are a member of {organizationName}. Owners and admins add people
          and change roles.
        </Notice>
      )}

      {resource.status === "error" ? (
        <ErrorState
          title="The members could not be loaded"
          message={resource.error.message}
          onRetry={retry}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {/* Title on the left, the one add action at the table's top-right corner. */}
          <div className="flex items-end justify-between gap-4">
            <div className="flex items-baseline gap-3">
              <h2 className="text-lg font-semibold">People</h2>
              {total !== null && total > 0 && (
                <p className={clsx("text-sm tabular-nums", mutedText)}>
                  {needle && visible.length !== total
                    ? `${visible.length} of ${total}`
                    : total}
                </p>
              )}
            </div>
            {manageable && (
              <button
                type="button"
                onClick={() => setAdding(true)}
                className={clsx(buttonPrimary, "h-9 px-3")}
              >
                <UserPlus aria-hidden="true" className="h-4 w-4" />
                Add member
              </button>
            )}
          </div>

          {total !== null && total > SEARCH_FROM && (
            <SearchInput
              label="Search members"
              placeholder="Search by name or email"
              value={query}
              onChange={setQuery}
              className="sm:w-80"
            />
          )}

          {resource.status === "loading" ? (
            <RoleTable title="Owners" loading />
          ) : needle && visible.length === 0 ? (
            <Panel className="px-6 py-10 text-center">
              <p className="text-sm font-medium">
                No one matches &ldquo;{query.trim()}&rdquo;
              </p>
              <button
                type="button"
                onClick={() => setQuery("")}
                className="mt-1 text-sm font-medium text-primary-700 underline decoration-current/30 underline-offset-4 hover:decoration-current"
              >
                Clear search
              </button>
            </Panel>
          ) : (
            // Highest rank first: owners, then admins, then members.
            GROUPS.map((group) => {
              const people = visible.filter((m) => group.match(m.role));
              // While searching, hide the groups with no matches.
              if (needle && people.length === 0) return null;
              return (
                <RoleTable
                  key={group.title}
                  title={group.title}
                  empty={group.empty}
                  members={people}
                  organizationId={organizationId}
                  isSelf={isSelf}
                />
              );
            })
          )}
        </div>
      )}

      {manageable && (
        <AddMemberModal
          viewerRole={viewerRole}
          open={adding}
          onClose={() => setAdding(false)}
          organizationId={organizationId}
          organizationName={organizationName}
          onAdded={reload}
        />
      )}
    </div>
  );
};

const GROUPS: {
  title: string;
  empty: string;
  match: (role: OrganizationRole) => boolean;
}[] = [
  { title: "Owners", empty: "No owners", match: (r) => r === OWNER },
  { title: "Admins", empty: "No admins yet", match: (r) => r === ADMIN },
  {
    title: "Members",
    empty: "No members yet",
    // Unknown roles land here too, so nobody disappears from the page.
    match: (r) => r !== OWNER && r !== ADMIN,
  },
];

/** One rank's table. The rank is the heading, so the rows carry no badge. */
const RoleTable = ({
  title,
  empty,
  members = [],
  organizationId = "",
  isSelf = () => false,
  loading,
}: {
  title: string;
  empty?: string;
  members?: OrganizationMember[];
  organizationId?: string;
  isSelf?: (member: OrganizationMember) => boolean;
  loading?: boolean;
}) => (
  <Panel className="overflow-hidden">
    <section aria-label={title}>
      <table className={clsx(tableLook, "table-fixed")}>
        <caption className="border-b border-brand-ink/10 px-4 py-3 text-left sm:px-6">
          <span className="text-sm font-semibold text-brand-ink">{title}</span>
          {!loading && (
            <span className={clsx("ml-2 text-sm tabular-nums", mutedText)}>
              {members.length}
            </span>
          )}
        </caption>
        <thead>
          <tr>
            <th scope="col" className={thLook}>
              Name
            </th>
            <th
              scope="col"
              className={clsx(thLook, "hidden w-40 md:table-cell")}
            >
              Joined
            </th>
            <th scope="col" className={clsx(thLook, "w-10")}>
              <span className="sr-only">Open</span>
            </th>
          </tr>
        </thead>
        <tbody aria-busy={loading}>
          {loading && <SkeletonRows columns={MEMBER_COLUMNS} />}
          {!loading && members.length === 0 && (
            <tr>
              <td
                colSpan={3}
                className={clsx("px-4 py-5 text-sm sm:px-6", mutedText)}
              >
                {empty}
              </td>
            </tr>
          )}
          {members.map((member, index) => (
            <tr
              key={member.userId}
              style={{ "--row": index } as React.CSSProperties}
              className={clsx(
                rowLook,
                "console-row-in group relative hover:bg-brand-wash/50",
              )}
            >
              <td className={tdLook}>
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar name={displayName(member)} src={member.avatarUrl} />
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 font-medium">
                      {/* The link covers the whole row. */}
                      <Link
                        href={memberPath(organizationId, member.userId)}
                        className="truncate after:absolute after:inset-0"
                      >
                        {displayName(member)}
                      </Link>
                      {isSelf(member) && (
                        <span className="shrink-0 rounded-[4px] bg-brand-wash px-1.5 py-0.5 text-[11px] font-medium text-primary-800">
                          You
                        </span>
                      )}
                    </p>
                    <p className={clsx("truncate text-xs", mutedText)}>
                      {member.email}
                    </p>
                  </div>
                </div>
              </td>
              <td
                className={clsx(
                  tdLook,
                  "hidden whitespace-nowrap md:table-cell",
                  mutedText,
                )}
              >
                {formatDate(member.joinedAt)}
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
    </section>
  </Panel>
);

/** Adding someone is a step of its own: the form only shows when asked for. */
const AddMemberModal = ({
  viewerRole,
  open,
  onClose,
  organizationId,
  organizationName,
  onAdded,
}: {
  viewerRole: OrganizationRole;
  open: boolean;
  onClose: () => void;
  organizationId: string;
  organizationName: string;
  onAdded: () => Promise<void>;
}) => {
  const { addToastMessage } = useToast();
  const handleApiError = useApiErrorHandler();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<number>(DEFAULT_MEMBER_ROLE);
  const [error, setError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  const close = () => {
    if (saving) return;
    setEmail("");
    setRole(DEFAULT_MEMBER_ROLE);
    setError(undefined);
    onClose();
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = email.trim();
    if (!EMAIL_PATTERN.test(trimmed)) {
      setError("Enter a valid email address.");
      return;
    }
    setError(undefined);
    setSaving(true);
    try {
      await organizationsApi.addMember(organizationId, {
        email: trimmed,
        role,
      });
      addToastMessage("success", `${trimmed} was added as ${roleLabel(role)}.`);
      setSaving(false);
      setEmail("");
      setRole(DEFAULT_MEMBER_ROLE);
      onClose();
      await onAdded();
    } catch (caught) {
      handleApiError(caught, {
        onFieldErrors: (fields) => setError(fields.email ?? fields.role),
      });
      setSaving(false);
    }
  };

  const selected = ORGANIZATION_ROLES.find((entry) => entry.value === role);

  return (
    <Modal
      open={open}
      onClose={close}
      title="Add a member"
      description={`They need a Cortex account. They will get access to ${organizationName}.`}
    >
      <form onSubmit={submit} noValidate className="flex flex-col gap-5">
        <Field label="Email" htmlFor="member-email" error={error}>
          <input
            id="member-email"
            name="email"
            type="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setError(undefined);
            }}
            maxLength={ORGANIZATION_LIMITS.emailMax}
            placeholder="teammate@yourstore.com"
            autoComplete="off"
            autoFocus
            required
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "member-email-error" : undefined}
            className={inputLook}
          />
        </Field>
        <Field label="Role" htmlFor="member-role" hint={selected?.description}>
          <select
            id="member-role"
            name="role"
            value={role}
            onChange={(event) => setRole(Number(event.target.value))}
            aria-describedby="member-role-hint"
            className={selectLook}
          >
            {assignableRoles(viewerRole).map((entry) => (
              <option key={entry.value} value={entry.value}>
                {entry.label}
              </option>
            ))}
          </select>
        </Field>
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
            {saving ? "Adding…" : "Add member"}
          </button>
        </div>
      </form>
    </Modal>
  );
};
