"use client";

import { useCallback, useState, type FormEvent } from "react";
import { clsx } from "clsx";
import { UserPlus } from "lucide-react";
import { useToast } from "@/app/features/toast/hooks/useToast";
import { useApiErrorHandler } from "@/app/shared/hooks/useApiErrorHandler";
import { organizationsApi } from "../api/organizationsApi";
import {
  useResource,
  type Resource,
} from "@/app/features/console/hooks/useResource";
import {
  DEFAULT_MEMBER_ROLE,
  ORGANIZATION_LIMITS,
  ORGANIZATION_ROLES,
  assignableRoles,
  roleLabel,
  type OrganizationInvitation,
  type OrganizationRole,
} from "../types/organization.types";
import {
  EmptyTableRow,
  Field,
  Modal,
  Panel,
  PanelHeader,
  RoleBadge,
  SkeletonRows,
  Spinner,
  buttonGhost,
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

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const selectLook = clsx(inputLook, "pr-8");

/**
 * The Invitations tab (owners and admins only): invite people by email and
 * manage the invitations they have not accepted yet. The organization page
 * never shows this tab to members, and the backend answers 403 for them.
 */
export const InvitationsPanel = ({
  organizationId,
  organizationName,
  viewerRole,
}: {
  organizationId: string;
  organizationName: string;
  /** Decides which roles may be offered. */
  viewerRole: OrganizationRole;
}) => {
  const load = useCallback(
    (signal: AbortSignal) =>
      organizationsApi.invitations(organizationId, signal),
    [organizationId],
  );
  const { resource, reload, retry } = useResource(load);
  const [inviting, setInviting] = useState(false);

  // Who is already in, so the invite form can refuse them before sending.
  const loadMembers = useCallback(
    (signal: AbortSignal) => organizationsApi.members(organizationId, signal),
    [organizationId],
  );
  const { resource: members, reload: reloadMembers } = useResource(loadMembers);

  const memberEmails = new Set(
    members.status === "ready"
      ? members.data.map((member) => member.email.toLowerCase())
      : [],
  );
  const pendingEmails = new Set(
    resource.status === "ready"
      ? resource.data.map((invitation) => invitation.email.toLowerCase())
      : [],
  );

  return (
    <>
      <PendingInvitations
        organizationId={organizationId}
        resource={resource}
        onRetry={retry}
        onChanged={reload}
        action={
          <button
            type="button"
            onClick={() => {
              setInviting(true);
              void reloadMembers();
            }}
            className={clsx(buttonPrimary, "shrink-0 whitespace-nowrap")}
          >
            <UserPlus aria-hidden="true" className="h-4 w-4" />
            Invite member
          </button>
        }
      />

      <InviteModal
        viewerRole={viewerRole}
        open={inviting}
        onClose={() => setInviting(false)}
        organizationId={organizationId}
        organizationName={organizationName}
        onInvited={reload}
        memberEmails={memberEmails}
        pendingEmails={pendingEmails}
      />
    </>
  );
};

const INVITATION_COLUMNS = ["", "w-24 sm:w-28", "hidden sm:table-cell", "w-24"];

/** Invitations sent but not accepted yet. Revoking one voids its link. */
const PendingInvitations = ({
  organizationId,
  resource,
  onRetry,
  onChanged,
  action,
}: {
  organizationId: string;
  resource: Resource<OrganizationInvitation[]>;
  onRetry: () => void;
  onChanged: () => Promise<unknown>;
  /** "Invite member", in the table's header bar. */
  action: React.ReactNode;
}) => {
  const { addToastMessage } = useToast();
  const handleApiError = useApiErrorHandler();
  const [revoking, setRevoking] = useState<string | null>(null);

  const revoke = async (invitation: OrganizationInvitation) => {
    setRevoking(invitation.id);
    try {
      await organizationsApi.revokeInvitation(organizationId, invitation.id);
      await onChanged();
      addToastMessage(
        "success",
        `The invitation to ${invitation.email} was revoked.`,
      );
    } catch (caught) {
      handleApiError(caught);
    } finally {
      setRevoking(null);
    }
  };

  const pending = resource.status === "ready" ? resource.data : [];

  return (
    <Panel className="overflow-hidden">
      <section aria-labelledby="pending-invitations">
        <PanelHeader
          id="pending-invitations"
          title="Pending invitations"
          count={resource.status === "ready" ? pending.length : null}
          description="People join once they accept the emailed link."
          actions={action}
        />
        <table className={clsx(tableLook, "table-fixed")}>
          <thead>
            <tr>
              <th scope="col" className={thLook}>
                Email
              </th>
              <th scope="col" className={clsx(thLook, "w-24 sm:w-28")}>
                Role
              </th>
              <th
                scope="col"
                className={clsx(thLook, "hidden w-36 sm:table-cell")}
              >
                Expires
              </th>
              <th scope="col" className={clsx(thLook, "w-24")}>
                <span className="sr-only">Revoke</span>
              </th>
            </tr>
          </thead>
          <tbody aria-busy={resource.status === "loading"}>
            {resource.status === "loading" && (
              <SkeletonRows columns={INVITATION_COLUMNS} />
            )}
            {resource.status === "error" && (
              <EmptyTableRow
                colSpan={4}
                title="The invitations could not be loaded"
              >
                <p>{resource.error.message}</p>
                <button
                  type="button"
                  onClick={onRetry}
                  className={clsx(buttonSecondary, "mt-3")}
                >
                  Try again
                </button>
              </EmptyTableRow>
            )}
            {resource.status === "ready" && pending.length === 0 && (
              <EmptyTableRow colSpan={4} title="No pending invitations">
                Use Invite member to add someone by email.
              </EmptyTableRow>
            )}
            {pending.map((invitation) => (
              <tr key={invitation.id} className={rowLook}>
                <td className={tdLook}>
                  <p className="truncate font-medium">{invitation.email}</p>
                  <p className={clsx("truncate text-xs", mutedText)}>
                    Invited by {invitation.invitedByName}
                  </p>
                </td>
                <td className={tdLook}>
                  <RoleBadge role={invitation.role} />
                </td>
                <td
                  className={clsx(
                    tdLook,
                    "hidden whitespace-nowrap sm:table-cell",
                    mutedText,
                  )}
                >
                  {formatDate(invitation.expiresAt)}
                </td>
                <td className={clsx(tdLook, "w-24 pr-2 text-right")}>
                  <button
                    type="button"
                    onClick={() => revoke(invitation)}
                    disabled={revoking !== null}
                    aria-label={`Revoke the invitation to ${invitation.email}`}
                    className={clsx(
                      buttonGhost,
                      "hover:bg-status-error-bg hover:text-status-error-text",
                    )}
                  >
                    {revoking === invitation.id ? <Spinner /> : "Revoke"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </Panel>
  );
};

/** Inviting someone is a step of its own: the form only shows when asked for. */
const InviteModal = ({
  viewerRole,
  open,
  onClose,
  organizationId,
  organizationName,
  onInvited,
  memberEmails,
  pendingEmails,
}: {
  viewerRole: OrganizationRole;
  open: boolean;
  onClose: () => void;
  organizationId: string;
  organizationName: string;
  /** Reloads the pending invitations; resolves once the backend answered. */
  onInvited: () => Promise<unknown>;
  /** Lower-cased emails of current members; they can't be invited. */
  memberEmails: Set<string>;
  /** Lower-cased emails that already have a pending invitation. */
  pendingEmails: Set<string>;
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
    if (memberEmails.has(trimmed.toLowerCase())) {
      setError(`${trimmed} is already a member of ${organizationName}.`);
      return;
    }
    if (pendingEmails.has(trimmed.toLowerCase())) {
      setError(`${trimmed} already has a pending invitation.`);
      return;
    }
    setError(undefined);
    setSaving(true);
    try {
      await organizationsApi.invite(organizationId, { email: trimmed, role });
      // Stay on "Sending…" until the pending list shows the invitation.
      await onInvited();
      addToastMessage(
        "success",
        `${trimmed} was invited as ${roleLabel(role)}.`,
      );
      setSaving(false);
      setEmail("");
      setRole(DEFAULT_MEMBER_ROLE);
      onClose();
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
      title="Invite a member"
      description={`We email them a link. They join ${organizationName} once they accept it.`}
    >
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
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
        <div className="mt-1 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
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
            {saving ? "Sending…" : "Send invitation"}
          </button>
        </div>
      </form>
    </Modal>
  );
};
