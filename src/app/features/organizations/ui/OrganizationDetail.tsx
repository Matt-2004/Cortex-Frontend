"use client";

import { useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { clsx } from "clsx";
import { Container } from "@/app/features/landing/ui/primitives";
import { organizationsApi } from "../api/organizationsApi";
import { useResource } from "@/app/features/console/hooks/useResource";
import { canManage } from "../types/organization.types";
import { PageHeader, SignedIn } from "@/app/features/console/ui/ConsoleShell";
import { InvitationsPanel } from "./InvitationsPanel";
import { MembersPanel } from "./MembersPanel";
import { SettingsPanel } from "./SettingsPanel";
import {
  Avatar,
  ErrorState,
  NoAccess,
  RoleBadge,
  Skeleton,
  buttonSecondary,
} from "@/app/features/console/ui/consoleUi";

/** `manageOnly` tabs are for owners and admins; members never see them. */
const TABS = [
  { id: "members", label: "Members", manageOnly: false },
  { id: "invitations", label: "Invitations", manageOnly: true },
  { id: "settings", label: "Settings", manageOnly: false },
] as const;

type TabId = (typeof TABS)[number]["id"];

const isTabId = (value: string | null): value is TabId =>
  TABS.some((entry) => entry.id === value);

const Breadcrumb = ({ current }: { current?: string }) => (
  <nav aria-label="Breadcrumb">
    <ol className="flex flex-wrap items-center gap-2">
      <li>
        <Link
          href="/console/organizations"
          className="underline decoration-current/30 underline-offset-4 transition-colors hover:text-brand-ink"
        >
          Organizations
        </Link>
      </li>
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

/** /console/organizations/{organizationId} — one organization: members, invitations and settings. */
export const OrganizationDetail = ({
  organizationId,
}: {
  organizationId: string;
}) => (
  <SignedIn fallback={<OrganizationDetailSkeleton />}>
    <Organization organizationId={organizationId} />
  </SignedIn>
);

const Organization = ({ organizationId }: { organizationId: string }) => {
  // The tab lives in the URL (?tab=settings) so a view can be shared or reloaded.
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const requested = searchParams.get("tab");
  const tab: TabId = isTabId(requested) ? requested : "members";
  const setTab = (next: TabId) =>
    router.replace(next === "members" ? pathname : `${pathname}?tab=${next}`, {
      scroll: false,
    });

  const load = useCallback(
    async (signal: AbortSignal) => {
      const organization = await organizationsApi.get(organizationId, signal);
      return organization;
    },
    [organizationId],
  );
  const { resource, reload, retry } = useResource(load);

  if (resource.status === "loading") return <OrganizationDetailSkeleton />;

  if (resource.status === "error") {
    const missing =
      resource.error.status === 404 || resource.error.status === 403;
    return (
      <>
        <PageHeader breadcrumb={<Breadcrumb />} title="Organization" />
        <Container className="py-8 sm:py-10">
          <ErrorState
            title={
              missing
                ? "This organization is not available"
                : "This organization could not be loaded"
            }
            message={
              missing
                ? "It may have been removed, or your account is not a member of it."
                : resource.error.message
            }
            onRetry={missing ? undefined : retry}
          >
            <Link href="/console/organizations" className={buttonSecondary}>
              Back to organizations
            </Link>
          </ErrorState>
        </Container>
      </>
    );
  }

  const organization = resource.data;
  const manageable = canManage(organization.role);
  const tabs = TABS.filter((entry) => manageable || !entry.manageOnly);
  // A member deep-linked to a manage-only tab lands on Members instead.
  const current: TabId = tabs.some((entry) => entry.id === tab)
    ? tab
    : "members";

  if (!manageable) {
    return (
      <>
        <PageHeader
          breadcrumb={<Breadcrumb current={organization.name} />}
          title={organization.name}
        />
        <Container className="py-8 sm:py-10">
          <NoAccess
            title="Only owners and admins can open this organization"
            message={`You are a member of ${organization.name}. Ask an owner or admin if you need to manage it.`}
            backHref="/console"
            backLabel="Back to overview"
          />
        </Container>
      </>
    );
  }

  return (
    <>
      <PageHeader
        breadcrumb={<Breadcrumb current={organization.name} />}
        title={organization.name}
        media={
          <Avatar
            name={organization.name}
            src={organization.logoUrl}
            shape="square"
            className="h-14 w-14 bg-white text-lg sm:h-16 sm:w-16"
          />
        }
        description={
          <span className="flex flex-wrap items-center gap-3">
            <span className="font-receipt text-[13px]">
              {organization.slug}
            </span>
            <RoleBadge role={organization.role} />
          </span>
        }
      >
        <div role="tablist" aria-label="Organization" className="flex gap-6">
          {tabs.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              role="tab"
              id={`tab-${id}`}
              aria-selected={current === id}
              aria-controls={`panel-${id}`}
              onClick={() => setTab(id)}
              className={clsx(
                "-mb-px border-b-2 pb-3 text-sm transition-colors duration-150",
                current === id
                  ? "border-primary-700 font-semibold text-brand-ink"
                  : "border-transparent text-[#4B5468] hover:text-brand-ink",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </PageHeader>

      <Container className="py-8 sm:py-10">
        <div
          role="tabpanel"
          id={`panel-${current}`}
          aria-labelledby={`tab-${current}`}
        >
          {current === "members" ? (
            <MembersPanel
              organizationId={organization.id}
              organizationName={organization.name}
              viewerRole={organization.role}
            />
          ) : current === "invitations" ? (
            <InvitationsPanel
              organizationId={organization.id}
              organizationName={organization.name}
              viewerRole={organization.role}
            />
          ) : (
            <SettingsPanel
              // Remount when the saved values change, so the form starts
              // from what the server now holds.
              key={`${organization.name}|${organization.logoUrl ?? ""}`}
              organization={organization}
              editable={manageable}
              onSaved={reload}
            />
          )}
        </div>
      </Container>
    </>
  );
};

/** Also the Suspense fallback while the route's id resolves. */
export const OrganizationDetailSkeleton = () => (
  <div role="status" aria-label="Loading organization">
    <div className="border-b border-brand-ink/10 bg-brand-wash">
      <Container className="pt-8 sm:pt-10">
        <Skeleton className="mb-4 h-4 w-40" />
        <div className="flex items-center gap-4">
          <Skeleton className="h-14 w-14 rounded-lg sm:h-16 sm:w-16" />
          <div>
            <Skeleton className="h-9 w-56 max-w-full" />
            <Skeleton className="mt-3 h-4 w-32" />
          </div>
        </div>
        <div className="mt-8 flex gap-6 pb-3">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
        </div>
      </Container>
    </div>
    <Container className="py-8 sm:py-10">
      <Skeleton className="h-40 w-full rounded-xl" />
    </Container>
  </div>
);
