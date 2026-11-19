"use client";

import { useCallback } from "react";
import Link from "next/link";
import { OrganizationBreadcrumb } from "./Breadcrumb";
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
import { BillingPanel } from "./BillingPanel";
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
  { id: "billing", label: "Billing", manageOnly: true },
] as const;

type TabId = (typeof TABS)[number]["id"];

const isTabId = (value: string | null): value is TabId =>
  TABS.some((entry) => entry.id === value);

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
        <PageHeader
          breadcrumb={<OrganizationBreadcrumb />}
          title="Organization"
        />
        <Container className="py-6">
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
          breadcrumb={<OrganizationBreadcrumb current={organization.name} />}
          title={organization.name}
        />
        <Container className="py-6">
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
        breadcrumb={<OrganizationBreadcrumb current={organization.name} />}
        title={organization.name}
        media={
          <Avatar
            name={organization.name}
            src={organization.logoUrl}
            shape="square"
            className="h-10 w-10 border border-brand-ink/10 bg-white text-sm"
          />
        }
        description={
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span translate="no">{organization.slug}</span>
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1.5">
              You are
              <RoleBadge role={organization.role} />
            </span>
          </span>
        }
      >
        <div
          role="tablist"
          aria-label="Organization"
          className="-mx-2 flex gap-0.5"
        >
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
                "-mb-px shrink-0 border-b-2 px-2 pb-2.5 text-sm font-medium whitespace-nowrap transition-colors duration-150",
                current === id
                  ? "border-brand-teal text-brand-ink"
                  : "border-transparent text-brand-ink-muted hover:border-brand-ink/20 hover:text-brand-ink",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </PageHeader>

      <Container className="py-6">
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
          ) : current === "billing" ? (
            <BillingPanel
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
      <Container className="pt-5 sm:pt-6">
        <Skeleton className="mb-2 h-3 w-40" />
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-box" />
          <div>
            <Skeleton className="h-7 w-56 max-w-full" />
            <Skeleton className="mt-2 h-4 w-32" />
          </div>
        </div>
        <div className="mt-4 flex gap-5 pb-2.5">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-12" />
        </div>
      </Container>
    </div>
    <Container className="py-6">
      <Skeleton className="h-40 w-full rounded-card" />
    </Container>
  </div>
);
