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
import {
  Avatar,
  ErrorState,
  Modal,
  Notice,
  Panel,
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

const Breadcrumb = ({
  organization,
  current,
}: {
  organization?: Organization;
  current?: string;
}) => (
  <nav aria-label="Breadcrumb">
    <ol className="flex flex-wrap items-center gap-2">
      <li>
        <Link
          href={ORGANIZATIONS_PATH}
          className="underline decoration-current/30 underline-offset-4 transition-colors hover:text-brand-ink"
        >
          Organizations
        </Link>
      </li>
      {organization && (
        <>
          <li aria-hidden="true">/</li>
          <li>
            <Link
              href={organizationPath(organization.id)}
              className="underline decoration-current/30 underline-offset-4 transition-colors hover:text-brand-ink"
            >
              {organization.name}
            </Link>
          </li>
        </>
      )}
      {current && (
        <>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="truncate text-brand-ink">
            {current}
          </li>
        </>
      )}
    </ol>
  </nav>
);

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
        <PageHeader breadcrumb={<Breadcrumb />} title="Member" />
        <Container className="py-8 sm:py-10">
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
          <Breadcrumb
            organization={organization}
            current={displayName(member)}
          />
        }
        title={displayName(member)}
        media={
          <Avatar
            name={displayName(member)}
            src={member.avatarUrl}
            className="h-14 w-14 bg-white text-lg sm:h-16 sm:w-16"
          />
        }
        description={
          <span className="flex flex-wrap items-center gap-3">
            <span>{member.email}</span>
            <RoleBadge role={member.role} />
            {self && (
              <span className="rounded-[4px] bg-white px-1.5 py-0.5 text-[11px] font-medium text-primary-800">
                You
              </span>
            )}
          </span>
        }
      />

      <Container className="grid items-start gap-6 py-8 sm:py-10 lg:grid-cols-12 lg:gap-8">
        <div className="flex flex-col gap-6 lg:col-span-7">
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

        <Panel className="p-5 sm:p-6 lg:col-span-5">
          <h2 className="text-base font-semibold">Details</h2>
          <dl className="mt-4 divide-y divide-brand-ink/10 text-sm">
            <Detail label="Email">{member.email}</Detail>
            <Detail label="Organization">{organization.name}</Detail>
            <Detail label="Joined">{formatDate(member.joinedAt)}</Detail>
            <Detail label="User ID">
              <span className="font-receipt text-[13px] break-all">
                {member.userId}
              </span>
            </Detail>
          </dl>
        </Panel>
      </Container>
    </>
  );
};

const Detail = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <div className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0">
    <dt className={clsx("text-xs", mutedText)}>{label}</dt>
    <dd className="min-w-0">{children}</dd>
  </div>
);

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
  onSaved: () => Promise<void>;
}) => {
  const allowed = assignableRoles(organization.role).map((r) => r.value);
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
      addToastMessage(
        "success",
        `${displayName(member)} is now ${roleLabel(role)}.`,
      );
      await onSaved();
    } catch (error) {
      handleApiError(error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Panel className="p-5 sm:p-6">
      <h2 className="text-base font-semibold">Role</h2>
      <p className={clsx("mt-1 text-sm", mutedText)}>
        What {self ? "you" : displayName(member)} can do in {organization.name}.
      </p>

      {!editable && (
        <div className="mt-5">
          <Notice>
            {member.role === OWNER
              ? "Only owners can change an owner's role."
              : "Only owners and admins can change roles."}
          </Notice>
        </div>
      )}

      <form onSubmit={submit} className="mt-5">
        <fieldset disabled={!editable || saving} className="min-w-0">
          <legend className="sr-only">Role</legend>
          <div className="flex flex-col gap-2">
            {ORGANIZATION_ROLES.map((entry) => {
              const checked = role === entry.value;
              // Admins can't make anyone an owner.
              const offLimits = editable && !allowed.includes(entry.value);
              return (
                <label
                  key={entry.value}
                  className={clsx(
                    "flex cursor-pointer items-start gap-3 rounded-lg border px-4 py-3 transition-colors duration-150",
                    "has-[:disabled]:cursor-default has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-brand-teal/30",
                    checked
                      ? "border-primary-700 bg-brand-wash/60"
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
                    className="mt-1 h-4 w-4 accent-primary-700"
                  />
                  <span>
                    <span className="block text-sm font-medium">
                      {entry.label}
                      {entry.value === member.role && (
                        <span
                          className={clsx(
                            "ml-2 text-xs font-normal",
                            mutedText,
                          )}
                        >
                          current
                        </span>
                      )}
                    </span>
                    <span className={clsx("block text-xs", mutedText)}>
                      {entry.description}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>

          {editable && allowed.length < ORGANIZATION_ROLES.length && (
            <p className={clsx("mt-3 text-xs", mutedText)}>
              Only owners can make someone an owner.
            </p>
          )}

          {editable && (
            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
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
      addToastMessage(
        "success",
        self
          ? `You left ${organization.name}.`
          : `${displayName(member)} was removed.`,
      );
      if (self) refresh();
      router.replace(
        self ? ORGANIZATIONS_PATH : organizationPath(organization.id),
      );
    } catch (error) {
      handleApiError(error);
      setBusy(false);
    }
  };

  return (
    <Panel className="flex flex-col gap-4 border-[#D92D20]/25 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
      <div>
        <h2 className="text-base font-semibold">
          {self ? "Leave organization" : "Remove from organization"}
        </h2>
        <p className={clsx("mt-1 text-sm", mutedText)}>
          {self
            ? `You will lose access to ${organization.name}.`
            : `${displayName(member)} will lose access to ${organization.name}.`}
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
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
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
      <Container className="pt-8 pb-8 sm:pt-10 sm:pb-10">
        <Skeleton className="mb-4 h-4 w-56" />
        <div className="flex items-center gap-4">
          <Skeleton className="h-14 w-14 rounded-full sm:h-16 sm:w-16" />
          <div>
            <Skeleton className="h-9 w-56 max-w-full" />
            <Skeleton className="mt-3 h-4 w-40" />
          </div>
        </div>
      </Container>
    </div>
    <Container className="grid gap-6 py-8 sm:py-10 lg:grid-cols-12 lg:gap-8">
      <Skeleton className="h-72 rounded-xl lg:col-span-7" />
      <Skeleton className="h-56 rounded-xl lg:col-span-5" />
    </Container>
  </div>
);
