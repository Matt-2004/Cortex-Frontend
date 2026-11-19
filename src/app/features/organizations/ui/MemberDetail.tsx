"use client";

import { useCallback, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import { Container } from "@/app/features/landing/ui/primitives";
import { useToast } from "@/app/features/toast/hooks/useToast";
import { useApiErrorHandler } from "@/app/shared/hooks/useApiErrorHandler";
import { ApiError } from "@/app/shared/utils/errors/apiError";
import { organizationsApi } from "../api/organizationsApi";
import { useResource } from "@/app/features/console/hooks/useResource";
import {
  ORGANIZATION_ROLES,
  OWNER,
  assignableRoles,
  canEditMember,
  roleLabel,
  type Organization,
  type OrganizationMember,
  type OrganizationRole,
} from "../types/organization.types";
import {
  PageHeader,
  SignedIn,
  useConsoleUser,
  useOrganizationAccess,
} from "@/app/features/console/ui/ConsoleShell";
import { displayName } from "./MembersPanel";
import { organizationPath } from "./OrganizationsHome";
import { OrganizationBreadcrumb } from "./Breadcrumb";
import {
  Avatar,
  Badge,
  CopyValue,
  DetailList,
  DetailRow,
  ErrorState,
  Modal,
  Notice,
  Panel,
  PanelHeader,
  RoleBadge,
  Skeleton,
  Spinner,
  buttonDanger,
  buttonPrimary,
  buttonSecondary,
  formatDate,
  mutedText,
} from "@/app/features/console/ui/consoleUi";

const ORGANIZATIONS_PATH = "/console/organizations";

/** /console/organizations/{organizationId}/members/{memberUserId} */
export const MemberDetail = ({
  organizationId,
  memberUserId,
}: {
  organizationId: string;
  memberUserId: string;
}) => (
  <SignedIn fallback={<MemberDetailSkeleton />}>
    <Member organizationId={organizationId} memberUserId={memberUserId} />
  </SignedIn>
);

const Member = ({
  organizationId,
  memberUserId,
}: {
  organizationId: string;
  memberUserId: string;
}) => {
  const user = useConsoleUser();

  // The API has no "get one member" endpoint: read the list and pick them out.
  const load = useCallback(
    async (signal: AbortSignal) => {
      const [organization, members] = await Promise.all([
        organizationsApi.get(organizationId, signal),
        organizationsApi.members(organizationId, signal),
      ]);
      const member = members.find((m) => m.userId === memberUserId);
      if (!member) {
        throw new ApiError({
          status: 404,
          message: "This person is not a member of the organization.",
        });
      }
      return { organization, member };
    },
    [organizationId, memberUserId],
  );
  const { resource, reload, retry } = useResource(load);

  if (resource.status === "loading") return <MemberDetailSkeleton />;

  if (resource.status === "error") {
    const missing =
      resource.error.status === 404 || resource.error.status === 403;
    return (
      <>
        <PageHeader breadcrumb={<OrganizationBreadcrumb />} title="Member" />
        <Container className="py-6">
          <ErrorState
            title={
              missing
                ? "This member is not available"
                : "This member could not be loaded"
            }
            message={
              missing
                ? "They may have been removed, or you are not in this organization."
                : resource.error.message
            }
            onRetry={missing ? undefined : retry}
          >
            <Link
              href={organizationPath(organizationId)}
              className={buttonSecondary}
            >
              Back to the organization
            </Link>
          </ErrorState>
        </Container>
      </>
    );
  }

  const { organization, member } = resource.data;
  const self =
    member.userId === user.id ||
    member.email.toLowerCase() === user.email.toLowerCase();
  // Owners edit anyone; admins edit admins and members, never owners.
  const editable = canEditMember(organization.role, member.role);

  return (
    <>
      <PageHeader
        breadcrumb={
          <OrganizationBreadcrumb
            trail={[
              {
                label: organization.name,
                href: organizationPath(organization.id),
              },
            ]}
            current={displayName(member)}
          />
        }
        title={displayName(member)}
        media={
          <Avatar
            name={displayName(member)}
            src={member.avatarUrl}
            className="h-10 w-10 border border-brand-ink/10 bg-white text-sm"
          />
        }
        description={
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="min-w-0 truncate">{member.email}</span>
            <RoleBadge role={member.role} />
            {self && <Badge>You</Badge>}
          </span>
        }
      />

      <Container className="py-6">
        <div className="flex max-w-3xl flex-col gap-4">
          <Panel className="overflow-hidden">
            <section aria-labelledby="member-details">
              <PanelHeader id="member-details" title="Details" />
              <DetailList>
                <DetailRow label="Joined">
                  {formatDate(member.joinedAt)}
                </DetailRow>
                <DetailRow label="User ID">
                  <CopyValue value={member.userId} label="user ID" />
                </DetailRow>
              </DetailList>
            </section>
          </Panel>

          <RolePanel
            key={member.role}
            organization={organization}
            member={member}
            editable={editable}
            self={self}
            onSaved={reload}
          />

          {(editable || self) && (
            <RemovePanel
              organization={organization}
              member={member}
              self={self}
            />
          )}
        </div>
      </Container>
    </>
  );
};

/** Pick a role from cards that say what each one can do, then save. */
const RolePanel = ({
  organization,
  member,
  editable,
  self,
  onSaved,
}: {
  organization: Organization;
  member: OrganizationMember;
  editable: boolean;
  self: boolean;
  /** Reloads the page; resolves once the backend has answered. */
  onSaved: () => Promise<unknown>;
}) => {
  const allowed = assignableRoles(organization.role).map((r) => r.value);
  const { refresh: refreshAccess } = useOrganizationAccess();
  const { addToastMessage } = useToast();
  const handleApiError = useApiErrorHandler();
  const [role, setRole] = useState<OrganizationRole>(member.role);
  const [saving, setSaving] = useState(false);
  const changed = role !== member.role;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!changed) return;
    setSaving(true);
    try {
      await organizationsApi.changeMemberRole(organization.id, member.userId, {
        role,
      });
      // Read back what the backend now holds before saying it is done. The
      // change can move the viewer's own role too (their own row, or an
      // ownership hand-over), which decides what the sidebar offers.
      await Promise.all([onSaved(), refreshAccess()]);
      addToastMessage(
        "success",
        `${displayName(member)} is now ${roleLabel(role)}.`,
      );
    } catch (error) {
      handleApiError(error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Panel className="overflow-hidden">
      <section aria-labelledby="member-role">
        <PanelHeader
          id="member-role"
          title="Role"
          description={`What ${self ? "you" : displayName(member)} can do in this organization.`}
        />

        {!editable && (
          <div className="px-4 pt-4">
            <Notice>
              {member.role === OWNER
                ? "Only owners can change an owner's role."
                : "Only owners and admins can change roles."}
            </Notice>
          </div>
        )}

        <form onSubmit={submit}>
          <fieldset disabled={!editable || saving} className="min-w-0">
            <legend className="sr-only">Role</legend>
            <div className="flex flex-col gap-2 p-4">
              {ORGANIZATION_ROLES.map((entry) => {
                const checked = role === entry.value;
                // Admins can't make anyone an owner.
                const offLimits = editable && !allowed.includes(entry.value);
                return (
                  <label
                    key={entry.value}
                    className={clsx(
                      "flex cursor-pointer items-center gap-3 rounded-box border px-3 py-2.5 transition-colors duration-150",
                      "has-[:disabled]:cursor-default has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-brand-teal/30",
                      checked
                        ? "border-brand-teal bg-brand-teal/5"
                        : "border-brand-ink/15 hover:border-brand-ink/30",
                      offLimits && "opacity-55",
                    )}
                  >
                    <input
                      type="radio"
                      name="role"
                      value={entry.value}
                      checked={checked}
                      disabled={offLimits}
                      onChange={() => setRole(entry.value)}
                      className="h-4 w-4 shrink-0 accent-primary-700"
                    />
                    <span className="w-16 shrink-0">
                      <RoleBadge role={entry.value} />
                    </span>
                    <span className={clsx("min-w-0 flex-1 text-sm", mutedText)}>
                      {entry.description}
                    </span>
                    {entry.value === member.role && (
                      <span className={clsx("shrink-0 text-xs", mutedText)}>
                        Current
                      </span>
                    )}
                  </label>
                );
              })}
              {editable && allowed.length < ORGANIZATION_ROLES.length && (
                <p className={clsx("text-xs", mutedText)}>
                  Only owners can make someone an owner.
                </p>
              )}
            </div>

            {editable && (
              <div className="flex flex-col-reverse gap-2 border-t border-brand-ink/10 bg-brand-mist/50 px-4 py-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setRole(member.role)}
                  disabled={!changed || saving}
                  className={buttonSecondary}
                >
                  Discard
                </button>
                <button
                  type="submit"
                  disabled={!changed || saving}
                  className={buttonPrimary}
                >
                  {saving && <Spinner />}
                  {saving ? "Saving…" : "Save role"}
                </button>
              </div>
            )}
          </fieldset>
        </form>
      </section>
    </Panel>
  );
};

const RemovePanel = ({
  organization,
  member,
  self,
}: {
  organization: Organization;
  member: OrganizationMember;
  self: boolean;
}) => {
  const router = useRouter();
  const { refresh } = useOrganizationAccess();
  const { addToastMessage } = useToast();
  const handleApiError = useApiErrorHandler();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const remove = async () => {
    setBusy(true);
    try {
      await organizationsApi.removeMember(organization.id, member.userId);
      // Leaving can take away the Organizations area: know before moving on.
      if (self) await refresh();
      addToastMessage(
        "success",
        self
          ? `You left ${organization.name}.`
          : `${displayName(member)} was removed.`,
      );
      router.replace(
        self ? ORGANIZATIONS_PATH : organizationPath(organization.id),
      );
    } catch (error) {
      handleApiError(error);
      setBusy(false);
    }
  };

  return (
    <Panel className="flex flex-col gap-3 border-status-error-border p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-sm font-semibold">
          {self ? "Leave organization" : "Remove from organization"}
        </h2>
        <p className={clsx("mt-1 text-sm", mutedText)}>
          {self
            ? "You will lose access to this organization."
            : `${displayName(member)} will lose access to this organization.`}
        </p>
      </div>
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className={clsx(buttonDanger, "shrink-0")}
      >
        {self ? "Leave" : "Remove member"}
      </button>

      <Modal
        open={confirming}
        onClose={() => {
          if (!busy) setConfirming(false);
        }}
        title={self ? "Leave this organization?" : "Remove this member?"}
        description={
          self
            ? `Someone in ${organization.name} will have to add you again.`
            : `${displayName(member)} can be added again later.`
        }
      >
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => setConfirming(false)}
            disabled={busy}
            className={buttonSecondary}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={remove}
            disabled={busy}
            className={buttonDanger}
          >
            {busy && <Spinner />}
            {self ? "Leave organization" : "Remove"}
          </button>
        </div>
      </Modal>
    </Panel>
  );
};

/** Also the Suspense fallback while the route's ids resolve. */
export const MemberDetailSkeleton = () => (
  <div role="status" aria-label="Loading member">
    <div className="border-b border-brand-ink/10 bg-brand-wash">
      <Container className="py-5 sm:py-6">
        <Skeleton className="mb-2 h-3 w-56" />
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div>
            <Skeleton className="h-7 w-56 max-w-full" />
            <Skeleton className="mt-2 h-4 w-40" />
          </div>
        </div>
      </Container>
    </div>
    <Container className="py-6">
      <div className="flex max-w-3xl flex-col gap-4">
        <Skeleton className="h-44 rounded-card" />
        <Skeleton className="h-56 rounded-card" />
      </div>
    </Container>
  </div>
);
