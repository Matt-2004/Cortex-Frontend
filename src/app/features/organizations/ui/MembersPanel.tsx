"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import { ChevronRight, Pencil } from "lucide-react";
import { organizationsApi } from "../api/organizationsApi";
import { useResource } from "@/app/features/console/hooks/useResource";
import {
  ADMIN,
  MEMBER,
  OWNER,
  canEditMember,
  canManage,
  type OrganizationMember,
  type OrganizationRole,
} from "../types/organization.types";
import { useConsoleUser } from "@/app/features/console/ui/ConsoleShell";
import {
  Avatar,
  Badge,
  EmptyTableRow,
  ErrorState,
  Notice,
  Panel,
  PanelHeader,
  RoleBadge,
  SearchInput,
  SkeletonRows,
  formatDate,
  inputLook,
  mutedText,
  rowLook,
  tableLook,
  tdLook,
  thLook,
} from "@/app/features/console/ui/consoleUi";

/** Below these widths a column hides; what it held moves under the name. */
const EMAIL_COL = "hidden md:table-cell";
const ID_COL = "hidden xl:table-cell";
const JOINED_COL = "hidden lg:table-cell";

const MEMBER_COLUMNS = [
  "hidden w-12 sm:table-cell",
  "",
  EMAIL_COL,
  ID_COL,
  "w-24 sm:w-28",
  JOINED_COL,
  "w-12",
];

const ROLE_FILTERS: { value: OrganizationRole; label: string }[] = [
  { value: OWNER, label: "Owner" },
  { value: ADMIN, label: "Admin" },
  { value: MEMBER, label: "Member" },
];

/** Owners first, then admins, then members; unknown roles count as members. */
const rank = (role: OrganizationRole) =>
  role === OWNER ? 0 : role === ADMIN ? 1 : 2;

const matchesRole = (role: OrganizationRole, filter: OrganizationRole) =>
  rank(role) === rank(filter);

export const displayName = (member: OrganizationMember) =>
  member.name.trim() || member.email;

export const memberPath = (organizationId: string, memberUserId: string) =>
  `/console/organizations/${encodeURIComponent(organizationId)}/members/${encodeURIComponent(memberUserId)}`;

/**
 * The Members tab: who is in the organization, in one table ranked owners →
 * admins → members, with a search and a role filter above it. Rows are
 * read-only; a row opens the member's own page, where their role is changed
 * or they are removed. People join by invitation (the Invitations tab).
 */
export const MembersPanel = ({
  organizationId,
  organizationName,
  viewerRole,
}: {
  organizationId: string;
  organizationName: string;
  /** The signed-in user's role here. */
  viewerRole: OrganizationRole;
}) => {
  const user = useConsoleUser();
  const manageable = canManage(viewerRole);

  const load = useCallback(
    (signal: AbortSignal) => organizationsApi.members(organizationId, signal),
    [organizationId],
  );
  const { resource, retry } = useResource(load);

  const [query, setQuery] = useState("");
  const [role, setRole] = useState<OrganizationRole | null>(null);
  const needle = query.trim().toLowerCase();
  const filtering = Boolean(needle) || role !== null;
  const total = resource.status === "ready" ? resource.data.length : null;
  const visible =
    resource.status === "ready"
      ? resource.data
          .filter(
            (member) =>
              (role === null || matchesRole(member.role, role)) &&
              (!needle ||
                member.name.toLowerCase().includes(needle) ||
                member.email.toLowerCase().includes(needle)),
          )
          .sort(
            (a, b) =>
              rank(a.role) - rank(b.role) ||
              displayName(a).localeCompare(displayName(b)),
          )
      : [];

  const isSelf = (member: OrganizationMember) =>
    member.userId === user.id ||
    member.email.toLowerCase() === user.email.toLowerCase();

  const clear = () => {
    setQuery("");
    setRole(null);
  };

  return (
    <div className="flex flex-col gap-4">
      {!manageable && (
        <Notice>
          You are a member of {organizationName}. Owners and admins invite
          people and change roles.
        </Notice>
      )}

      {resource.status === "error" ? (
        <ErrorState
          title="The members could not be loaded"
          message={resource.error.message}
          onRetry={retry}
        />
      ) : (
        <>
          <MembersTable
            loading={resource.status === "loading"}
            header={
              <PanelHeader
                title="Members"
                count={total}
                description={
                  filtering && total !== null
                    ? `Showing ${visible.length} of ${total}`
                    : undefined
                }
                actions={
                  <>
                    <SearchInput
                      label="Search members"
                      placeholder="Search name or email"
                      value={query}
                      onChange={setQuery}
                      className="sm:w-60"
                    />
                    <select
                      aria-label="Filter by role"
                      value={role ?? ""}
                      onChange={(event) =>
                        setRole(
                          event.target.value
                            ? Number(event.target.value)
                            : null,
                        )
                      }
                      className={clsx(inputLook, "w-full pr-8 sm:w-32")}
                    >
                      <option value="">All roles</option>
                      {ROLE_FILTERS.map((entry) => (
                        <option key={entry.value} value={entry.value}>
                          {entry.label}
                        </option>
                      ))}
                    </select>
                  </>
                }
              />
            }
            members={visible}
            organizationId={organizationId}
            isSelf={isSelf}
            canEdit={(member) => canEditMember(viewerRole, member.role)}
            empty={
              filtering ? (
                <EmptyTableRow colSpan={7} title="No one matches">
                  <button
                    type="button"
                    onClick={clear}
                    className="font-medium text-primary-700 underline decoration-current/30 underline-offset-4 hover:decoration-current"
                  >
                    Clear filters
                  </button>
                </EmptyTableRow>
              ) : (
                <EmptyTableRow colSpan={7} title="No people yet" />
              )
            }
          />
        </>
      )}
    </div>
  );
};

const MembersTable = ({
  members,
  organizationId,
  isSelf,
  canEdit,
  loading,
  empty,
  header,
}: {
  members: OrganizationMember[];
  organizationId: string;
  isSelf: (member: OrganizationMember) => boolean;
  /** Whether the viewer can change this member (role, removal). */
  canEdit: (member: OrganizationMember) => boolean;
  loading: boolean;
  empty: React.ReactNode;
  header: React.ReactNode;
}) => (
  <Panel className="overflow-hidden">
    {header}
    <table className={clsx(tableLook, "table-fixed")}>
      <caption className="sr-only">People in this organization</caption>
      <thead>
        <tr>
          <th scope="col" className={clsx(thLook, "hidden w-12 sm:table-cell")}>
            #
          </th>
          <th scope="col" className={thLook}>
            Name
          </th>
          <th scope="col" className={clsx(thLook, EMAIL_COL)}>
            Email
          </th>
          <th scope="col" className={clsx(thLook, ID_COL, "w-44")}>
            ID
          </th>
          <th scope="col" className={clsx(thLook, "w-24 sm:w-28")}>
            Role
          </th>
          <th scope="col" className={clsx(thLook, JOINED_COL, "w-36")}>
            Joined
          </th>
          <th scope="col" className={clsx(thLook, "w-12")}>
            <span className="sr-only">Action</span>
          </th>
        </tr>
      </thead>
      <tbody aria-busy={loading}>
        {loading && <SkeletonRows columns={MEMBER_COLUMNS} />}
        {!loading && members.length === 0 && empty}
        {!loading &&
          members.map((member, index) => (
            <tr
              key={member.userId}
              style={{ "--row": index } as React.CSSProperties}
              className={clsx(
                rowLook,
                "console-row-in group relative hover:bg-brand-wash/50",
              )}
            >
              <td
                className={clsx(
                  tdLook,
                  "hidden tabular-nums sm:table-cell",
                  mutedText,
                )}
              >
                {index + 1}
              </td>
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
                        <span className="sr-only">
                          {canEdit(member) ? " (edit)" : " (view)"}
                        </span>
                      </Link>
                      {isSelf(member) && (
                        <Badge className="shrink-0">You</Badge>
                      )}
                    </p>
                    {/* Narrow screens have no email column. */}
                    <p
                      className={clsx("truncate text-xs md:hidden", mutedText)}
                    >
                      {member.email}
                    </p>
                  </div>
                </div>
              </td>
              <td className={clsx(tdLook, EMAIL_COL, mutedText)}>
                <p className="truncate">{member.email}</p>
              </td>
              <td className={clsx(tdLook, ID_COL, mutedText)}>
                <p
                  title={member.userId}
                  translate="no"
                  className="truncate font-receipt text-xs"
                >
                  {member.userId}
                </p>
              </td>
              <td className={tdLook}>
                <RoleBadge role={member.role} />
              </td>
              <td
                className={clsx(
                  tdLook,
                  JOINED_COL,
                  "whitespace-nowrap",
                  mutedText,
                )}
              >
                {formatDate(member.joinedAt)}
              </td>
              <td className={clsx(tdLook, "w-12 pl-0 text-right")}>
                {/* Pencil: this row opens a page where you can change the
                    member. Chevron: it opens their details only. */}
                {canEdit(member) ? (
                  <Pencil
                    aria-hidden="true"
                    className="ml-auto h-4 w-4 text-brand-ink-faint transition-colors duration-150 group-hover:text-primary-700"
                  />
                ) : (
                  <ChevronRight
                    aria-hidden="true"
                    className="ml-auto h-4 w-4 text-brand-ink-faint transition-transform duration-150 group-hover:translate-x-0.5"
                  />
                )}
              </td>
            </tr>
          ))}
      </tbody>
    </table>
  </Panel>
);
