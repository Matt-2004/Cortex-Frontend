import { Suspense } from "react";
import type { Metadata } from "next";
import {
  OrganizationDetail,
  OrganizationDetailSkeleton,
} from "@/app/features/organizations/ui/OrganizationDetail";

export const metadata: Metadata = { title: "Organization" };

/**
 * The id is only known at request time, so with Cache Components it is read
 * behind a Suspense boundary; the skeleton is the prerendered shell.
 */
export default function OrganizationPage({
  params,
}: {
  params: Promise<{ organizationId: string }>;
}) {
  return (
    <Suspense fallback={<OrganizationDetailSkeleton />}>
      {params.then(({ organizationId }) => (
        <OrganizationDetail
          key={organizationId}
          organizationId={organizationId}
        />
      ))}
    </Suspense>
  );
}
